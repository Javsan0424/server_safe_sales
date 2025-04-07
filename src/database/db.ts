import mysql from 'mysql2';
import fs from 'fs';

const db = mysql.createConnection({
    host: "mysql-19d2a149-tec-2932.c.aivencloud.com",
    port: 13130,
    user: "avnadmin",
    password: "AVNS_7AxjeyZxAOrWBQbYW5N",
    database: "defaultdb",
    ssl: {
        ca: fs.readFileSync("ca(4).pem"),
    },
});

db.connect((err) => {
    if (err) {
        console.error("Error de conexión: ", err);
        return;
    }
    console.log("Conexión exitosa a la base de datos!!");
});

export { db };