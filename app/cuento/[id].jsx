import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";

const TEMAS = {
  light: {
    fondo: "#f7f5f0",
    campo: "#fff",
    borde: "#e8e2d5",
    texto: "#1f2d24",
    secundario: "#7a8b7f",
    placeholder: "#8b988f",
  },
  dark: {
    fondo: "#101813",
    campo: "#17231c",
    borde: "#2f4437",
    texto: "#edf6f0",
    secundario: "#a9b8ae",
    placeholder: "#839188",
  },
};

function claveEtiquetas(ids) {
  return [...ids].sort((a, b) => a - b).join(",");
}

export default function Editor() {
  const db = useSQLiteContext();
  const router = useRouter();
  const navigation = useNavigation();
  const esquema = useColorScheme();
  const colores = TEMAS[esquema === "dark" ? "dark" : "light"];
  const { id } = useLocalSearchParams();
  const esNuevo = id === "nuevo";
  const [titulo, setTitulo] = useState("");
  const [cuerpo, setCuerpo] = useState("");
  const [etiquetas, setEtiquetas] = useState([]);
  const [etiquetasSeleccionadas, setEtiquetasSeleccionadas] = useState([]);
  const originalRef = useRef({ titulo: "", cuerpo: "", etiquetas: "" });
  const puedeSalirRef = useRef(false);
  const cuentoIdRef = useRef(esNuevo ? null : Number(id));

  useEffect(() => {
    async function cargar() {
      const todasEtiquetas = await db.getAllAsync(
        "SELECT id, nombre FROM etiqueta ORDER BY nombre ASC"
      );
      setEtiquetas(todasEtiquetas);

      if (esNuevo) return;

      const fila = await db.getFirstAsync(
        "SELECT titulo, cuerpo FROM cuento WHERE id = ?",
        [Number(id)]
      );
      const filasEtiquetas = await db.getAllAsync(
        "SELECT etiqueta_id FROM cuento_etiqueta WHERE cuento_id = ?",
        [Number(id)]
      );
      const ids = filasEtiquetas.map((item) => item.etiqueta_id);

      if (fila) {
        cuentoIdRef.current = Number(id);
        setTitulo(fila.titulo);
        setCuerpo(fila.cuerpo);
        setEtiquetasSeleccionadas(ids);
        originalRef.current = {
          titulo: fila.titulo,
          cuerpo: fila.cuerpo,
          etiquetas: claveEtiquetas(ids),
        };
      }
    }

    cargar();
  }, [id, esNuevo, db]);

  // T10: guardar automáticamente después de tres segundos de inactividad.
  useEffect(() => {
    if (!titulo.trim() || !hayCambios) return;

    const temporizador = setTimeout(async () => {
      const ahora = new Date().toISOString();
      const limpio = titulo.trim();
      let cuentoId = cuentoIdRef.current;

      if (cuentoId == null) {
        const resultado = await db.runAsync(
          "INSERT INTO cuento (titulo, cuerpo, creado, editado) VALUES (?, ?, ?, ?)",
          [limpio, cuerpo, ahora, ahora]
        );
        cuentoId = resultado.lastInsertRowId;
        cuentoIdRef.current = cuentoId;
      } else {
        await db.runAsync(
          "UPDATE cuento SET titulo = ?, cuerpo = ?, editado = ? WHERE id = ?",
          [limpio, cuerpo, ahora, cuentoId]
        );
      }

      await guardarEtiquetas(cuentoId);
      originalRef.current = {
        titulo: limpio,
        cuerpo,
        etiquetas: claveEtiquetas(etiquetasSeleccionadas),
      };
    }, 3000);

    return () => clearTimeout(temporizador);
  }, [titulo, cuerpo, etiquetasSeleccionadas, db]);

  const palabras = useMemo(() => {
    const texto = cuerpo.trim();
    if (!texto) return 0;
    return texto.split(/\s+/).length;
  }, [cuerpo]);

  const hayCambios =
    titulo !== originalRef.current.titulo ||
    cuerpo !== originalRef.current.cuerpo ||
    claveEtiquetas(etiquetasSeleccionadas) !== originalRef.current.etiquetas;

  useEffect(() => {
    const cancelar = navigation.addListener("beforeRemove", (evento) => {
      if (puedeSalirRef.current || !hayCambios) return;

      evento.preventDefault();

      Alert.alert(
        "Salir sin guardar",
        "Tienes cambios sin guardar. Deseas descartarlos?",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Descartar",
            style: "destructive",
            onPress: () => {
              puedeSalirRef.current = true;
              navigation.dispatch(evento.data.action);
            },
          },
        ]
      );
    });

    return cancelar;
  }, [hayCambios, navigation]);

  function alternarEtiqueta(etiquetaId) {
    setEtiquetasSeleccionadas((actuales) =>
      actuales.includes(etiquetaId)
        ? actuales.filter((idActual) => idActual !== etiquetaId)
        : [...actuales, etiquetaId]
    );
  }

  async function guardarEtiquetas(cuentoId) {
    await db.runAsync("DELETE FROM cuento_etiqueta WHERE cuento_id = ?", [cuentoId]);

    for (const etiquetaId of etiquetasSeleccionadas) {
      await db.runAsync(
        "INSERT INTO cuento_etiqueta (cuento_id, etiqueta_id) VALUES (?, ?)",
        [cuentoId, etiquetaId]
      );
    }
  }

  async function guardar() {
    const limpio = titulo.trim();

    if (!limpio) {
      Alert.alert("Falta el titulo", "Todo cuento necesita un nombre.");
      return;
    }

    const ahora = new Date().toISOString();
    let cuentoId = Number(id);

    if (esNuevo) {
      const resultado = await db.runAsync(
        "INSERT INTO cuento (titulo, cuerpo, creado, editado) VALUES (?, ?, ?, ?)",
        [limpio, cuerpo, ahora, ahora]
      );
      cuentoId = resultado.lastInsertRowId;
    } else {
      await db.runAsync(
        "UPDATE cuento SET titulo = ?, cuerpo = ?, editado = ? WHERE id = ?",
        [limpio, cuerpo, ahora, cuentoId]
      );
    }

    await guardarEtiquetas(cuentoId);

    originalRef.current = {
      titulo: limpio,
      cuerpo,
      etiquetas: claveEtiquetas(etiquetasSeleccionadas),
    };
    puedeSalirRef.current = true;
    router.back();
  }

  function confirmarBorrado() {
    Alert.alert("Borrar cuento", "Esta accion no se puede deshacer.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Borrar",
        style: "destructive",
        onPress: async () => {
          await db.runAsync("DELETE FROM cuento_etiqueta WHERE cuento_id = ?", [
            Number(id),
          ]);
          await db.runAsync("DELETE FROM cuento WHERE id = ?", [Number(id)]);
          puedeSalirRef.current = true;
          router.back();
        },
      },
    ]);
  }

  return (
    <KeyboardAvoidingView
      style={[styles.contenedor, { backgroundColor: colores.fondo }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen
        options={{
          title: esNuevo ? "Nuevo cuento" : "Editar cuento",
          headerStyle: { backgroundColor: "#1b4332" },
          headerTintColor: "#fff",
        }}
      />
      <TextInput
        style={[
          styles.titulo,
          {
            backgroundColor: colores.campo,
            borderColor: colores.borde,
            color: colores.texto,
          },
        ]}
        placeholder="Titulo del cuento"
        placeholderTextColor={colores.placeholder}
        value={titulo}
        onChangeText={setTitulo}
      />
      <View style={styles.etiquetas}>
        {etiquetas.map((etiqueta) => {
          const activa = etiquetasSeleccionadas.includes(etiqueta.id);

          return (
            <Pressable
              key={etiqueta.id}
              style={[
                styles.etiqueta,
                {
                  backgroundColor: activa ? "#1b4332" : colores.campo,
                  borderColor: activa ? "#1b4332" : colores.borde,
                },
              ]}
              onPress={() => alternarEtiqueta(etiqueta.id)}
            >
              <Text
                style={[
                  styles.etiquetaTexto,
                  { color: activa ? "#fff" : colores.texto },
                ]}
              >
                {etiqueta.nombre}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <TextInput
        style={[
          styles.cuerpo,
          {
            backgroundColor: colores.campo,
            borderColor: colores.borde,
            color: colores.texto,
          },
        ]}
        placeholder="Habia una vez, en la quebrada..."
        placeholderTextColor={colores.placeholder}
        value={cuerpo}
        onChangeText={setCuerpo}
        multiline
        textAlignVertical="top"
      />
      <Text style={[styles.contador, { color: colores.secundario }]}>
        {palabras} palabras
      </Text>
      <Pressable style={styles.guardar} onPress={guardar}>
        <Text style={styles.guardarTexto}>Guardar</Text>
      </Pressable>
      {!esNuevo && (
        <Pressable onPress={confirmarBorrado}>
          <Text style={styles.borrar}>Borrar este cuento</Text>
        </Pressable>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, padding: 16, gap: 12 },
  titulo: {
    fontSize: 18,
    fontWeight: "600",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e8e2d5",
  },
  etiquetas: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  etiqueta: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  etiquetaTexto: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  cuerpo: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e8e2d5",
  },
  contador: { color: "#7a8b7f", fontSize: 13, textAlign: "right" },
  guardar: {
    backgroundColor: "#1b4332",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  guardarTexto: { color: "#fff", fontWeight: "600" },
  borrar: { textAlign: "center", color: "#a4161a", paddingVertical: 10 },
});
