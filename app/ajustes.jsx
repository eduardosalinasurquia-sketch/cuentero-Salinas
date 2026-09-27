import { Alert, Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import { Stack } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

const TEMAS = {
  light: {
    fondo: "#f7f5f0",
    secundario: "#7a8b7f",
  },
  dark: {
    fondo: "#101813",
    secundario: "#a9b8ae",
  },
};

export default function Ajustes() {
  const db = useSQLiteContext();
  const esquema = useColorScheme();
  const colores = TEMAS[esquema === "dark" ? "dark" : "light"];

  async function exportar() {
    const cuentos = await db.getAllAsync(
      "SELECT titulo, cuerpo, creado FROM cuento ORDER BY creado ASC"
    );

    if (cuentos.length === 0) {
      Alert.alert("Nada que exportar", "Todavia no has escrito ningun cuento.");
      return;
    }

    const texto = cuentos
      .map((cuento) => `# ${cuento.titulo}\n(${cuento.creado.slice(0, 10)})\n\n${cuento.cuerpo}`)
      .join("\n\n---\n\n");
    const archivo = new File(Paths.document, "cuentos.md");
    archivo.write(texto);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(archivo.uri);
    } else {
      Alert.alert("Guardado", `Archivo creado en: ${archivo.uri}`);
    }
  }

  return (
    <View style={[styles.contenedor, { backgroundColor: colores.fondo }]}>
      <Stack.Screen
        options={{
          title: "Ajustes",
          headerStyle: { backgroundColor: "#1b4332" },
          headerTintColor: "#fff",
        }}
      />
      <Pressable style={styles.boton} onPress={exportar}>
        <Text style={styles.botonTexto}>Exportar todos mis cuentos</Text>
      </Pressable>
      <Text style={[styles.nota, { color: colores.secundario }]}>
        Se genera un archivo Markdown con todos tus cuentos y se abre el menu para
        compartirlo.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, padding: 16, gap: 12 },
  boton: {
    backgroundColor: "#1b4332",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  botonTexto: { color: "#fff", fontWeight: "600" },
  nota: { color: "#7a8b7f", fontSize: 13, lineHeight: 19 },
});
