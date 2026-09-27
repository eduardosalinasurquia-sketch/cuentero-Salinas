import { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";

const TEMAS = {
  light: {
    fondo: "#f7f5f0",
    tarjeta: "#fff",
    borde: "#e8e2d5",
    principal: "#1b4332",
    texto: "#1f2d24",
    secundario: "#7a8b7f",
    campo: "#fff",
    placeholder: "#8b988f",
  },
  dark: {
    fondo: "#101813",
    tarjeta: "#17231c",
    borde: "#2f4437",
    principal: "#74c69d",
    texto: "#edf6f0",
    secundario: "#a9b8ae",
    campo: "#17231c",
    placeholder: "#839188",
  },
};

export default function Lista() {
  const db = useSQLiteContext();
  const router = useRouter();
  const esquema = useColorScheme();
  const colores = TEMAS[esquema === "dark" ? "dark" : "light"];
  const [cuentos, setCuentos] = useState([]);
  const [etiquetas, setEtiquetas] = useState([]);
  const [etiquetaActiva, setEtiquetaActiva] = useState(null);
  const [total, setTotal] = useState(0);
  const [busqueda, setBusqueda] = useState("");

  useFocusEffect(
    useCallback(() => {
      let activo = true;

      async function cargar() {
        const texto = busqueda.trim();
        const condiciones = [];
        const parametros = [];

        if (texto) {
          condiciones.push("c.titulo LIKE ?");
          parametros.push(`%${texto}%`);
        }

        if (etiquetaActiva) {
          condiciones.push(`
            EXISTS (
              SELECT 1
              FROM cuento_etiqueta filtro
              WHERE filtro.cuento_id = c.id AND filtro.etiqueta_id = ?
            )
          `);
          parametros.push(etiquetaActiva);
        }

        const where = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "";
        const filas = await db.getAllAsync(
          `
            SELECT
              c.id,
              c.titulo,
              c.cuerpo,
              c.editado,
              c.favorito,
              GROUP_CONCAT(e.nombre, ', ') AS etiquetas
            FROM cuento c
            LEFT JOIN cuento_etiqueta ce ON ce.cuento_id = c.id
            LEFT JOIN etiqueta e ON e.id = ce.etiqueta_id
            ${where}
            GROUP BY c.id
            ORDER BY c.favorito DESC, c.editado DESC
          `,
          parametros
        );
        const todasEtiquetas = await db.getAllAsync(
          "SELECT id, nombre FROM etiqueta ORDER BY nombre ASC"
        );
        const conteo = await db.getFirstAsync("SELECT COUNT(*) AS total FROM cuento");

        if (activo) {
          setCuentos(filas);
          setEtiquetas(todasEtiquetas);
          setTotal(conteo?.total ?? 0);
        }
      }

      cargar();

      return () => {
        activo = false;
      };
    }, [db, busqueda, etiquetaActiva])
  );

  async function alternarFavorito(cuento) {
    const siguiente = cuento.favorito ? 0 : 1;
    await db.runAsync("UPDATE cuento SET favorito = ? WHERE id = ?", [
      siguiente,
      cuento.id,
    ]);
    setCuentos((actuales) =>
      actuales
        .map((item) =>
          item.id === cuento.id ? { ...item, favorito: siguiente } : item
        )
        .sort((a, b) => b.favorito - a.favorito || b.editado.localeCompare(a.editado))
    );
  }

  return (
    <View style={[styles.contenedor, { backgroundColor: colores.fondo }]}>
      <Stack.Screen
        options={{
          title: `Cuentero (${total})`,
          headerStyle: { backgroundColor: "#1b4332" },
          headerTintColor: "#fff",
          headerRight: () => (
            <Pressable onPress={() => router.push("/ajustes")}>
              <Text style={{ color: "#fff", fontSize: 16 }}>Ajustes</Text>
            </Pressable>
          ),
        }}
      />
      <TextInput
        style={[
          styles.buscador,
          {
            backgroundColor: colores.campo,
            borderColor: colores.borde,
            color: colores.texto,
          },
        ]}
        placeholder="Buscar por titulo"
        placeholderTextColor={colores.placeholder}
        value={busqueda}
        onChangeText={setBusqueda}
      />
      <View style={styles.filtros}>
        <Pressable
          style={[
            styles.filtro,
            {
              backgroundColor: etiquetaActiva === null ? "#1b4332" : colores.campo,
              borderColor: etiquetaActiva === null ? "#1b4332" : colores.borde,
            },
          ]}
          onPress={() => setEtiquetaActiva(null)}
        >
          <Text
            style={[
              styles.filtroTexto,
              { color: etiquetaActiva === null ? "#fff" : colores.texto },
            ]}
          >
            Todas
          </Text>
        </Pressable>
        {etiquetas.map((etiqueta) => (
          <Pressable
            key={etiqueta.id}
            style={[
              styles.filtro,
              {
                backgroundColor:
                  etiquetaActiva === etiqueta.id ? "#1b4332" : colores.campo,
                borderColor:
                  etiquetaActiva === etiqueta.id ? "#1b4332" : colores.borde,
              },
            ]}
            onPress={() => setEtiquetaActiva(etiqueta.id)}
          >
            <Text
              style={[
                styles.filtroTexto,
                { color: etiquetaActiva === etiqueta.id ? "#fff" : colores.texto },
              ]}
            >
              {etiqueta.nombre}
            </Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={cuentos}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingTop: 0, gap: 12 }}
        ListEmptyComponent={
          <Text style={[styles.vacio, { color: colores.secundario }]}>
            {busqueda.trim() || etiquetaActiva
              ? "No hay cuentos con ese filtro."
              : "Todavia no hay cuentos. Toca + para escribir el primero."}
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={[
              styles.tarjeta,
              { backgroundColor: colores.tarjeta, borderColor: colores.borde },
            ]}
            onPress={() => router.push(`/cuento/${item.id}`)}
          >
            <View style={styles.tarjetaCabecera}>
              <Text style={[styles.tarjetaTitulo, { color: colores.principal }]}>
                {item.titulo}
              </Text>
              <Pressable
                hitSlop={10}
                onPress={() => alternarFavorito(item)}
                style={styles.favorito}
              >
                <Text
                  style={[
                    styles.favoritoTexto,
                    { color: item.favorito ? "#f2b705" : colores.secundario },
                  ]}
                >
                  {item.favorito ? "★" : "☆"}
                </Text>
              </Pressable>
            </View>
            {!!item.etiquetas && (
              <Text style={[styles.tarjetaEtiquetas, { color: colores.secundario }]}>
                {item.etiquetas}
              </Text>
            )}
            <Text style={[styles.tarjetaVista, { color: colores.texto }]} numberOfLines={2}>
              {item.cuerpo.slice(0, 80)}
            </Text>
            <Text style={[styles.tarjetaFecha, { color: colores.secundario }]}>
              {new Date(item.editado).toLocaleDateString("es-PE")}
            </Text>
          </Pressable>
        )}
      />
      <Pressable style={styles.boton} onPress={() => router.push("/cuento/nuevo")}>
        <Text style={styles.botonTexto}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1 },
  buscador: {
    margin: 16,
    marginBottom: 12,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 15,
  },
  filtros: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  filtro: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filtroTexto: { fontSize: 13, fontWeight: "600" },
  tarjeta: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e8e2d5",
  },
  tarjetaTitulo: { flex: 1, fontSize: 16, fontWeight: "600", color: "#1b4332" },
  tarjetaCabecera: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  favorito: {
    alignItems: "center",
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  favoritoTexto: { fontSize: 24, lineHeight: 26 },
  tarjetaEtiquetas: {
    fontSize: 12,
    marginTop: 4,
    textTransform: "capitalize",
  },
  tarjetaVista: { color: "#3d4f44", marginTop: 6, lineHeight: 19 },
  tarjetaFecha: { fontSize: 12, color: "#7a8b7f", marginTop: 4 },
  vacio: { textAlign: "center", color: "#7a8b7f", marginTop: 40 },
  boton: {
    position: "absolute",
    right: 20,
    bottom: 28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1b4332",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
  botonTexto: { color: "#fff", fontSize: 28, lineHeight: 30 },
});
