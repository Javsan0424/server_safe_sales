import { Request, Response } from 'express';
import { RowDataPacket, OkPacket, ResultSetHeader } from 'mysql2';
import { db } from '../database/db';

class DataController {
    handleQuery = (query: string, res: Response, params: any[] = []) => {
        db.query(query, params, (err, result) => {
            if (err) {
                console.error("Error en la consulta: ", err);
                res.status(500).send("Error en la consulta a la base de datos");
                return;
            }
            res.json(result);
        });
    };

    
    getVentas = (_req: Request, res: Response) => this.handleQuery('SELECT * FROM Ventas', res);
    getClientes = (_req: Request, res: Response) => this.handleQuery('SELECT * FROM Clientes', res);
    getProductos = (_req: Request, res: Response) => this.handleQuery('SELECT * FROM Productos', res);


    getNegociaciones = (_req: Request, res: Response) => {
    const query = `
        SELECT n.*, c.Nombre as ClienteNombre 
        FROM Negociaciones n
        LEFT JOIN Clientes c ON n.Cliente_ID = c.Cliente_ID
    `;
    this.handleQuery(query, res);
    };

    updateNegociacion = (req: Request, res: Response) => {
        const { id } = req.params;
        const { Cliente_ID, Fecha_Inicio, Fecha_Cierre, Estatus } = req.body;
        
        if (!id || isNaN(Number(id))) {
            return res.status(400).json({ success: false, message: "ID de negociación no válido" });
        }

        const query = `
            UPDATE Negociaciones SET 
            Cliente_ID = ?, Fecha_Inicio = ?, Fecha_Cierre = ?, Estatus = ?
            WHERE ID_Negociaciones = ?
        `;
        this.handleQuery(query, res, [Cliente_ID, Fecha_Inicio, Fecha_Cierre, Estatus, id]);
    };




    getEmpresas = (_req: Request, res: Response) => this.handleQuery('SELECT * FROM Empresas', res);
    
    
    addEmpresa = (req: Request, res: Response) => {
        const { Nombre, Numero, Direccion } = req.body;
        
        if (!Nombre || !Direccion) {
            res.status(400).json({ success: false, message: "Nombre y Dirección son campos obligatorios" });
            return;
        }

        const query = 'INSERT INTO Empresas (Nombre, Numero, Direccion) VALUES (?, ?, ?)';
        this.handleQuery(query, res, [Nombre, Numero, Direccion]);
    };

    
    deleteEmpresa = (req: Request, res: Response) => {
        const { id } = req.params;
        
        if (!id || isNaN(Number(id))) {
            res.status(400).json({ success: false, message: "ID de empresa no válido" });
            return;
        }

        db.query('SELECT * FROM Empresas WHERE Empresas_ID = ?', [id], (err, result) => {
            if (err) {
                console.error("Error en la consulta: ", err);
                res.status(500).json({ success: false, message: "Error en la consulta a la base de datos" });
                return;
            }

            const empresas = result as any[];
            if (empresas.length === 0) {
                res.status(404).json({ success: false, message: "Empresa no encontrada" });
                return;
            }

            
            db.query('SELECT * FROM Clientes WHERE Empresa_ID = ?', [id], (err, clientesResult) => {
                if (err) {
                    console.error("Error en la consulta: ", err);
                    res.status(500).json({ success: false, message: "Error en la consulta a la base de datos" });
                    return;
                }

                const clientes = clientesResult as any[];
                if (clientes.length > 0) {
                    res.status(400).json({ 
                        success: false, 
                        message: "No se puede eliminar la empresa porque tiene clientes asociados" 
                    });
                    return;
                }

                
                const deleteQuery = 'DELETE FROM Empresas WHERE Empresas_ID = ?';
                this.handleQuery(deleteQuery, res, [id]);
            });
        });
    };

    
    addCliente = (req: Request, res: Response) => {
        const { Nombre, Email, Telefono, Empresa_ID } = req.body;
        
        if (!Nombre || !Email || !Empresa_ID) {
            return res.status(400).json({ success: false, message: "Nombre, Email y Empresa son campos obligatorios" });
        }

        if (!/^\S+@\S+\.\S+$/.test(Email)) {
            return res.status(400).json({ success: false, message: "Por favor ingrese un email válido" });
        }

        const query = 'INSERT INTO Clientes (Nombre, Email, Telefono, Empresa_ID) VALUES (?, ?, ?, ?)';
        this.handleQuery(query, res, [Nombre, Email, Telefono, Empresa_ID]);
    };

    

    deleteCliente = (req: Request, res: Response) => {
        const { id } = req.params;
        
        if (!id || isNaN(Number(id))) {
            return res.status(400).json({ success: false, message: "ID de cliente no válido" });
        }

        // 1. Verificar si el cliente existe
        db.query<RowDataPacket[]>(
            'SELECT Cliente_ID FROM Clientes WHERE Cliente_ID = ?', 
            [id], 
            (err, result) => {
                if (err) {
                    return res.status(500).json({ success: false, message: "Error en la consulta a la base de datos" });
                }

                if (result.length === 0) {
                    return res.status(404).json({ success: false, message: "Cliente no encontrado" });
                }

                // 2. Verificar relaciones
                db.query<RowDataPacket[]>(
                    `SELECT 1 as existe FROM Negociaciones WHERE Cliente_ID = ? 
                    UNION 
                    SELECT 1 as existe FROM Ventas WHERE Cliente_ID = ?`, 
                    [id, id], 
                    (err, relaciones) => {
                        if (err) {
                            return res.status(500).json({ success: false, message: "Error en la consulta a la base de datos" });
                        }

                        if (relaciones.length > 0) {
                            return res.status(400).json({ 
                                success: false, 
                                message: "No se puede eliminar el cliente porque tiene negociaciones o ventas asociadas" 
                            });
                        }

                        // 3. Eliminar el cliente
                        db.query<OkPacket>(
                            'DELETE FROM Clientes WHERE Cliente_ID = ?', 
                            [id], 
                            (err, result) => {
                                if (err) {
                                    return res.status(500).json({ success: false, message: "Error al eliminar el cliente" });
                                }
                                res.json({ success: true, message: "Cliente eliminado correctamente" });
                            }
                        );
                    }
                );
            }
        );
    };


    


    
    loginUser = (req: Request, res: Response): void => {
        const { email, password }: { email?: string; password?: string } = req.body;

        if (!email || !password) {
            res.status(400).json({ success: false, message: "Email y contraseña son requeridos" });
            return;
        }

        const SQL_QUERY = 'SELECT * FROM Cuenta_Valida WHERE email = ? AND password = ?';

        db.query(SQL_QUERY, [email, password], (err, result) => {
            if (err) {
                console.error("Error en la consulta: ", err);
                res.status(500).json({ success: false, message: "Error en la consulta a la base de datos" });
                return;
            }

            const users = result as any[];
            if (users.length > 0) {
                res.json({ success: true });
            } else {
                res.json({ success: false, message: "Credenciales incorrectas" });
            }
        });
    };
}

export default DataController;