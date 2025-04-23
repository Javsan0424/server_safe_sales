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

    

    deleteCliente = (req: Request, res: Response): void => {
        const { id } = req.params;
        
        if (!id || isNaN(Number(id))) {
            res.status(400).json({ success: false, message: "ID de cliente no válido" });
            return;
        }
    
        // 1. Verify client exists
        db.query<RowDataPacket[]>(
            'SELECT Cliente_ID FROM Clientes WHERE Cliente_ID = ?', 
            [id], 
            (err, result) => {
                if (err) {
                    console.error("Database error:", err);
                    res.status(500).json({ success: false, message: "Error en la consulta a la base de datos" });
                    return;
                }
    
                if (result.length === 0) {
                    res.status(404).json({ success: false, message: "Cliente no encontrado" });
                    return;
                }
    
                // 2. Check for related records
                db.query<RowDataPacket[]>(
                    `SELECT 1 as existe FROM Negociaciones WHERE Cliente_ID = ? 
                     UNION 
                     SELECT 1 as existe FROM Ventas WHERE Cliente_ID = ?`, 
                    [id, id], 
                    (err, relaciones) => {
                        if (err) {
                            console.error("Database error:", err);
                            res.status(500).json({ success: false, message: "Error en la consulta a la base de datos" });
                            return;
                        }
    
                        if (relaciones.length > 0) {
                            res.status(400).json({ 
                                success: false, 
                                message: "No se puede eliminar el cliente porque tiene negociaciones o ventas asociadas" 
                            });
                            return;
                        }
    
                        // 3. Delete the client
                        db.query<OkPacket>(
                            'DELETE FROM Clientes WHERE Cliente_ID = ?', 
                            [id], 
                            (err, result) => {
                                if (err) {
                                    console.error("Database error:", err);
                                    res.status(500).json({ success: false, message: "Error al eliminar el cliente" });
                                    return;
                                }
                                
                                if (result.affectedRows === 0) {
                                    res.status(404).json({ success: false, message: "Cliente no encontrado" });
                                    return;
                                }
                                
                                res.json({ 
                                    success: true, 
                                    message: "Cliente eliminado correctamente",
                                    deletedId: id
                                });
                            }
                        );
                    }
                );
            }
        );
    };

    // Add new product
    addProducto = (req: Request, res: Response) => {
        const { Nombre, Precio, Descripcion, Stock, Categoria } = req.body;
        
        console.log("Received product data:", req.body); // Debug log
    
        // Validation
        if (!Nombre || !Categoria) {
            console.log("Validation failed: Missing name or category"); // Debug log
            return res.status(400).json({ 
                success: false, 
                message: "Nombre y Categoría son campos obligatorios" 
            });
        }
    
        if (isNaN(Precio)) {
            console.log("Validation failed: Invalid price"); // Debug log
            return res.status(400).json({ 
                success: false, 
                message: "Precio debe ser un número válido" 
            });
        }
    
        if (isNaN(Stock)) {
            console.log("Validation failed: Invalid stock"); // Debug log
            return res.status(400).json({ 
                success: false, 
                message: "Stock debe ser un número válido" 
            });
        }
    
        const query = `
            INSERT INTO Productos 
            (Nombre, Precio, Descripcion, Stock, Categoria) 
            VALUES (?, ?, ?, ?, ?)
        `;
        
        const params = [
            Nombre, 
            parseFloat(Precio), 
            Descripcion || null, 
            parseInt(Stock), 
            Categoria
        ];
    
        console.log("Executing query:", query, "with params:", params); // Debug log
        
        db.query(query, params, (err, result: ResultSetHeader) => {
            if (err) {
                console.error("Database error:", err);
                return res.status(500).json({ 
                    success: false, 
                    message: "Error en la base de datos",
                    error: err.message 
                });
            }
    
            console.log("Insert result:", result); // Debug log
            
            if (result.affectedRows === 1) {
                return res.status(201).json({ 
                    success: true,
                    message: "Producto agregado correctamente",
                    productId: result.insertId,
                    product: {
                        Producto_ID: result.insertId,
                        Nombre,
                        Precio: parseFloat(Precio),
                        Descripcion,
                        Stock: parseInt(Stock),
                        Categoria
                    }
                });
            } else {
                return res.status(500).json({ 
                    success: false, 
                    message: "No se pudo agregar el producto" 
                });
            }
        });
    };

    // Update existing product
    updateProducto = (req: Request, res: Response) => {
        const { id } = req.params;
        const { Nombre, Precio, Descripcion, Stock, Categoria } = req.body;
        
        // Validate ID
        if (!id || isNaN(Number(id))) {
            return res.status(400).json({ 
                success: false, 
                message: "ID de producto no válido" 
            });
        }

        // Validate required fields
        if (!Nombre || !Categoria) {
            return res.status(400).json({ 
                success: false, 
                message: "Nombre y Categoría son campos obligatorios" 
            });
        }

        // Validate numbers
        if (isNaN(Precio) || isNaN(Stock)) {
            return res.status(400).json({ 
                success: false, 
                message: "Precio y Stock deben ser números válidos" 
            });
        }

        const query = `
            UPDATE Productos SET 
            Nombre = ?, 
            Precio = ?, 
            Descripcion = ?, 
            Stock = ?, 
            Categoria = ?
            WHERE Producto_ID = ?
        `;
        
        this.handleQuery(query, res, [
            Nombre, 
            parseFloat(Precio), 
            Descripcion || null, 
            parseInt(Stock), 
            Categoria, 
            id
        ]);
    };

    // Delete product
    deleteProducto = (req: Request, res: Response) => {
        const { id } = req.params;
        
        // Validate ID
        if (!id || isNaN(Number(id))) {
            return res.status(400).json({ 
                success: false, 
                message: "ID de producto no válido" 
            });
        }

        // First check if product exists
        db.query<RowDataPacket[]>(
            'SELECT Producto_ID FROM Productos WHERE Producto_ID = ?', 
            [id], 
            (err, result) => {
                if (err) {
                    console.error("Database error:", err);
                    return res.status(500).json({ 
                        success: false, 
                        message: "Error en la consulta a la base de datos" 
                    });
                }

                if (result.length === 0) {
                    return res.status(404).json({ 
                        success: false, 
                        message: "Producto no encontrado" 
                    });
                }

                // Check for related records in Ventas
                db.query<RowDataPacket[]>(
                    'SELECT 1 as existe FROM Ventas WHERE Producto_ID = ?', 
                    [id], 
                    (err, ventas) => {
                        if (err) {
                            console.error("Database error:", err);
                            return res.status(500).json({ 
                                success: false, 
                                message: "Error en la consulta a la base de datos" 
                            });
                        }

                        if (ventas.length > 0) {
                            return res.status(400).json({ 
                                success: false, 
                                message: "No se puede eliminar el producto porque tiene ventas asociadas" 
                            });
                        }

                        // If no related records, proceed with deletion
                        db.query<OkPacket>(
                            'DELETE FROM Productos WHERE Producto_ID = ?', 
                            [id], 
                            (err, result) => {
                                if (err) {
                                    console.error("Database error:", err);
                                    return res.status(500).json({ 
                                        success: false, 
                                        message: "Error al eliminar el producto" 
                                    });
                                }
                                
                                if (result.affectedRows === 0) {
                                    return res.status(404).json({ 
                                        success: false, 
                                        message: "Producto no encontrado" 
                                    });
                                }
                                
                                return res.json({ 
                                    success: true, 
                                    message: "Producto eliminado correctamente",
                                    deletedId: id
                                });
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