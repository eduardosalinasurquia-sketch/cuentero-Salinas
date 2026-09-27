import { Suspense } from "react";
import { ActivityIndicator, View } from "react-native";
import { Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";

async function iniciarBD(db) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS cuento (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo  TEXT NOT NULL,
      cuerpo  TEXT NOT NULL DEFAULT '',
      creado  TEXT NOT NULL,
      editado TEXT NOT NULL,
      favorito INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS etiqueta (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE
    );
    CREATE TABLE IF NOT EXISTS cuento_etiqueta (
      cuento_id INTEGER NOT NULL,
      etiqueta_id INTEGER NOT NULL,
      PRIMARY KEY (cuento_id, etiqueta_id),
      FOREIGN KEY (cuento_id) REFERENCES cuento(id) ON DELETE CASCADE,
      FOREIGN KEY (etiqueta_id) REFERENCES etiqueta(id) ON DELETE CASCADE
    );
  `);

  try {
    await db.execAsync("ALTER TABLE cuento ADD COLUMN favorito INTEGER NOT NULL DEFAULT 0;");
  } catch (error) {
    if (!String(error?.message).includes("duplicate column name")) {
      throw error;
    }
  }

  const etiquetas = ["chullachaqui", "yacuruna", "sachamama", "tunchi", "bufeo colorado"];
  for (const nombre of etiquetas) {
    await db.runAsync("INSERT OR IGNORE INTO etiqueta (nombre) VALUES (?)", [nombre]);
  }

  // Cuentos aportados para la entrega inicial. INSERT OR IGNORE evita duplicarlos.
  const cuentosIniciales = [
    {
      titulo: "El Chullachaqui",
      cuerpo:
        "Chullachaqui es un enano o un demonio de la selva cuyo nombre proviene de los términos quechuas para «disímil» (Chulla) y «pie» (Chaqui), esto es «los pies disímiles». Según la leyenda de Iquitos, este ser tiene la habilidad de transformarse en cualquier persona que él desea para engañar visitantes o los locales. Él puede aparecer como un miembro de la familia o un amigo, conduciéndolos hacia caminos equivocados, yendo más y más profundo en la selva y luego dejarlos allí, perdidos. Para un niño, el Chullachaqui muchas veces aparecerá como un niño u otro compañero de juego. Bajo este disfraz, tratará de atraer con engaño al niño en el bosque para que se pierda. La única forma para descubrir la verdadera identidad de este ser maligno es mirar sus pies, puesto que uno de sus pies es diferente. Consecuentemente, él tratará de esconder sus pies. Estando descubierto, el Chullachaqui escapará en la selva.",
    },
    {
      titulo: "Leyenda del Ayaymama",
      cuerpo:
        "Según la leyenda del Ayaymama, su origen se debe a dos niños cuyo padre falleció y que su madre dejó con una mujer rica de la zona. La mujer los maltrataba y los mandó a buscar agua. En el camino encontraron una laguna y allí se quedaron dormidos. Al despertar se habían convertido en aves.\n\nDesde entonces los niños volaban por el monte repitiendo: «Ayaymama, ayaymama», mientras buscaban a su madre. La leyenda explica que el canto del ayaymama recuerda a los niños que fueron abandonados en el bosque.",
    },
    {
      titulo: "El Yacuruna",
      cuerpo:
        "Un día, un joven llamado Nima estaba pescando en el río. De pronto, Nima descubrió un yacuruna bebé. Entonces, se lo llevó a su casa y le hizo un pequeño pozo con agua en el patio. Desde ese día el yacuruna vivió allí.\n\nCada día Nima le daba de comer y el pozo se iba rompiendo más y más. Incluso, cuando el yacuruna se movía, las cosas temblaban. Eso le preocupaba a Nima porque por ahí pasaban todos los pobladores.\n\nEl yacuruna le dijo: «No te preocupes, niño, te quiero mucho. Tú eres mi papá y te voy a cuidar siempre». Pero quiero que me lleves a una laguna grande para poder seguir viviendo.\n\nAl despertar, el joven cumplió lo que el yacuruna le había pedido y lo llevó a vivir a una laguna cercana. Desde ese día, el yacuruna siempre se le aparecía en sueños a Nima. En su sueño le decía: «Nima, ¿dónde pescar los mejores peces de la laguna?». Cada vez que sus pobladores salían a pescar los peces, algunos podían ver al yacuruna salir de la laguna. Pasaron los años y Nima murió. Desde aquel día, nunca más se volvió a ver al yacuruna.",
    },
  ];

  for (const cuento of cuentosIniciales) {
    const existente = await db.getFirstAsync(
      "SELECT id FROM cuento WHERE titulo = ?",
      [cuento.titulo]
    );
    if (!existente) {
      const ahora = new Date().toISOString();
      await db.runAsync(
        "INSERT INTO cuento (titulo, cuerpo, creado, editado) VALUES (?, ?, ?, ?)",
        [cuento.titulo, cuento.cuerpo, ahora, ahora]
      );
    }
  }
}

export default function Layout() {
  return (
    <Suspense
      fallback={
        <View style={{ flex: 1, justifyContent: "center" }}>
          <ActivityIndicator size="large" />
        </View>
      }
    >
      <SQLiteProvider databaseName="cuentero.db" onInit={iniciarBD} useSuspense>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: "#1b4332" },
            headerTintColor: "#fff",
          }}
        />
      </SQLiteProvider>
    </Suspense>
  );
}
