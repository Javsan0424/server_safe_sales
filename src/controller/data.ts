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

    addNegociacion = (req: Request, res: Response) => {
        const { Cliente_ID, Fecha_Inicio, Estatus } = req.body;
        
        if (!Cliente_ID || isNaN(Number(Cliente_ID))) {
            return res.status(400).json({ 
                success: false, 
                message: "Cliente_ID es un campo obligatorio y debe ser un número válido" 
            });
        }
    
        const status = Estatus || "Iniciado";
        const startDate = Fecha_Inicio || new Date().toISOString().split('T')[0];
    
        const query = `
            INSERT INTO Negociaciones 
            (Cliente_ID, Fecha_Inicio, Estatus) 
            VALUES (?, ?, ?)
        `;
        
        db.query(query, [Cliente_ID, startDate, status], (err, result: ResultSetHeader) => {
            if (err) {
                console.error("Database error:", err);
                return res.status(500).json({ 
                    success: false, 
                    message: "Error en la base de datos",
                    error: err.message 
                });
            }
            
            if (result.affectedRows === 1) {
                return res.status(201).json({ 
                    success: true,
                    message: "Negociación creada correctamente",
                    negociacionId: result.insertId
                });
            } else {
                return res.status(500).json({ 
                    success: false, 
                    message: "No se pudo crear la negociación" 
                });
            }
        });
    };

    updateNegociacion = (req: Request, res: Response) => {
        const { id } = req.params;
        const { Estatus } = req.body;
    
        if (!id || isNaN(Number(id))) {
            return res.status(400).json({ success: false, message: "ID inválido" });
        }
    
        const validStatuses = ['Iniciado', 'Terminado', 'Cancelado', 'En Revisión'];
        if (!validStatuses.includes(Estatus)) {
            return res.status(400).json({ 
                success: false, 
                message: `Estatus inválido. Use uno de: ${validStatuses.join(', ')}`
            });
        }
    
        const updateData: any = {
            Estatus
        };
    
        if (['Terminado', 'Cancelado'].includes(Estatus)) {
            updateData.Fecha_Cierre = new Date().toISOString().slice(0, 19).replace('T', ' ');
        } else {
            updateData.Fecha_Cierre = null;
        }
    
        const query = `
            UPDATE Negociaciones SET 
            Fecha_Cierre = ?, 
            Estatus = ?
            WHERE ID_Negociaciones = ?
        `;
    
        db.query(
            query,
            [updateData.Fecha_Cierre, updateData.Estatus, id],
            (err, result: any) => {
                if (err) {
                    console.error("Database error:", err);
                    return res.status(500).json({ 
                        success: false, 
                        message: "Error en la base de datos",
                        sqlError: err.message 
                    });
                }
    
                if (result.affectedRows === 0) {
                    return res.status(404).json({ 
                        success: false, 
                        message: "Negociación no encontrada" 
                    });
                }
    
                return res.json({ 
                    success: true,
                    message: "Negociación actualizada correctamente",
                    data: {
                        ID_Negociaciones: id,
                        ...updateData
                    }
                });
            }
        );
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

    
    addProducto = (req: Request, res: Response) => {
        const { Nombre, Precio, Descripcion, Stock, Categoria } = req.body;
        
        console.log("Received product data:", req.body); 
    
        
        if (!Nombre || !Categoria) {
            console.log("Validation failed: Missing name or category"); 
            return res.status(400).json({ 
                success: false, 
                message: "Nombre y Categoría son campos obligatorios" 
            });
        }
    
        if (isNaN(Precio)) {
            console.log("Validation failed: Invalid price"); 
            return res.status(400).json({ 
                success: false, 
                message: "Precio debe ser un número válido" 
            });
        }
    
        if (isNaN(Stock)) {
            console.log("Validation failed: Invalid stock"); 
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
    
        console.log("Executing query:", query, "with params:", params); 
        
        db.query(query, params, (err, result: ResultSetHeader) => {
            if (err) {
                console.error("Database error:", err);
                return res.status(500).json({ 
                    success: false, 
                    message: "Error en la base de datos",
                    error: err.message 
                });
            }
    
            console.log("Insert result:", result); 
            
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

   updateProducto = (req: Request, res: Response) => {
    const { id } = req.params;
    const { Nombre, Precio, Descripcion, Stock, Categoria } = req.body;
    
    
    if (!id || isNaN(Number(id))) {
        return res.status(400).json({ 
            success: false, 
            message: "ID de producto no válido" 
        });
    }

    
    if (!Nombre || !Categoria) {
        return res.status(400).json({ 
            success: false, 
            message: "Nombre y Categoría son campos obligatorios" 
        });
    }

   
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
    
    db.query(query, [
        Nombre, 
        parseFloat(Precio), 
        Descripcion || null, 
        parseInt(Stock), 
        Categoria, 
        id
    ], (err, result: OkPacket) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ 
                success: false, 
                message: "Error en la base de datos",
                error: err.message 
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
            message: "Producto actualizado correctamente",
            productId: id
        });
    });
};
    
    deleteProducto = (req: Request, res: Response) => {
        const { id } = req.params;
        
        
        if (!id || isNaN(Number(id))) {
            return res.status(400).json({ 
                success: false, 
                message: "ID de producto no válido" 
            });
        }

        
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






    
    addVenta = (req: Request, res: Response) => {
        const { Cliente_ID, Producto_ID, Comision, Fecha, Metodo_pago, Estado_pago, Total } = req.body;
        
        
        if (!Cliente_ID || !Producto_ID || !Fecha || !Metodo_pago || !Estado_pago || !Total) {
            return res.status(400).json({ 
                success: false, 
                message: "Cliente, Producto, Fecha, Método de pago, Estado y Total son campos obligatorios" 
            });
        }

        
        const validPaymentMethods = ['Efectivo', 'Tarjeta'];
        if (!validPaymentMethods.includes(Metodo_pago)) {
            return res.status(400).json({ 
                success: false, 
                message: `Método de pago inválido. Use uno de: ${validPaymentMethods.join(', ')}`
            });
        }

        
        const validPaymentStatus = ['Pendiente', 'Pagado'];
        if (!validPaymentStatus.includes(Estado_pago)) {
            return res.status(400).json({ 
                success: false, 
                message: `Estado de pago inválido. Use uno de: ${validPaymentStatus.join(', ')}`
            });
        }

        
        if (isNaN(Comision) || isNaN(Total)) {
            return res.status(400).json({ 
                success: false, 
                message: "Comisión y Total deben ser números válidos" 
            });
        }

        const query = `
            INSERT INTO Ventas 
            (Cliente_ID, Producto_ID, Comision, Fecha, Metodo_pago, Estado_pago, Total) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        db.query(
            query,
            [Cliente_ID, Producto_ID, Comision, Fecha, Metodo_pago, Estado_pago, Total],
            (err, result: ResultSetHeader) => {
                if (err) {
                    console.error("Database error:", err);
                    return res.status(500).json({ 
                        success: false, 
                        message: "Error en la base de datos",
                        error: err.message 
                    });
                }
                
                if (result.affectedRows === 1) {
                    return res.status(201).json({ 
                        success: true,
                        message: "Venta registrada correctamente",
                        ventaId: result.insertId 
                    });
                } else {
                    return res.status(500).json({ 
                        success: false, 
                        message: "No se pudo registrar la venta" 
                    });
                }
            }
        );
    };

    
    updateVenta = (req: Request, res: Response) => {
        const { id } = req.params;
        const { Cliente_ID, Producto_ID, Comision, Fecha, Metodo_pago, Estado_pago, Total } = req.body;
    
        if (!id || isNaN(Number(id))) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid sale ID format" 
            });
        }
    
        
        if (!Cliente_ID || !Producto_ID || !Total) {
            return res.status(400).json({
                success: false,
                message: "Client, Product and Total are required fields"
            });
        }
    
        
        const comisionValue = Comision ? parseFloat(Comision) : 0;
        const totalValue = parseFloat(Total);
        
        if (isNaN(totalValue)) {
            return res.status(400).json({ 
                success: false, 
                message: "Total must be a valid number" 
            });
        }
    
        let fechaValue;
        try {
            fechaValue = Fecha ? new Date(Fecha).toISOString().slice(0, 19).replace('T', ' ') : 
                                new Date().toISOString().slice(0, 19).replace('T', ' ');
        } catch (e) {
            return res.status(400).json({
                success: false,
                message: "Invalid date format"
            });
        }
    
        const query = `
            UPDATE Ventas SET 
            Cliente_ID = ?,
            Producto_ID = ?,
            Comision = ?,
            Fecha = ?,
            Metodo_pago = ?,
            Estado_pago = ?,
            Total = ?
            WHERE Ventas_ID = ?
        `;
        
        const params = [
            Number(Cliente_ID),
            Number(Producto_ID),
            comisionValue,
            fechaValue,
            Metodo_pago,
            Estado_pago,
            totalValue,
            Number(id)
        ];
    
        console.log("Executing query:", query, "with params:", params); 
    
        db.query(query, params, (err: any, result: any) => {
            if (err) {
                console.error("Database error details:", {
                    code: err.code,
                    errno: err.errno,
                    sqlMessage: err.sqlMessage, 
                    sql: err.sql,
                    stack: err.stack
                });
    

                if (err.errno === 1452) {
                    const detail = err.sqlMessage.includes('Cliente_ID') ? 
                        "The specified client doesn't exist" : 
                        "The specified product doesn't exist";
                    return res.status(400).json({
                        success: false,
                        message: "Foreign key constraint fails",
                        detail
                    });
                }
    
                return res.status(500).json({ 
                    success: false, 
                    message: "Database operation failed",
                    errorDetails: {
                        code: err.code,
                        sqlMessage: err.sqlMessage,
                        sqlState: err.sqlState
                    }
                });
            }
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: "No sale found with the specified ID",
                    ventaId: id
                });
            }
            
            return res.json({ 
                success: true,
                message: "Sale updated successfully",
                ventaId: id,
                changes: result.changedRows
            });
        });
    };

    
    deleteVenta = (req: Request, res: Response) => {
        const { id } = req.params;
        
        if (!id || isNaN(Number(id))) {
            return res.status(400).json({ 
                success: false, 
                message: "ID de venta no válido" 
            });
        }

        
        db.query<RowDataPacket[]>(
            'SELECT Ventas_ID FROM Ventas WHERE Ventas_ID = ?', 
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
                        message: "Venta no encontrada" 
                    });
                }

                
                db.query<OkPacket>(
                    'DELETE FROM Ventas WHERE Ventas_ID = ?', 
                    [id], 
                    (err, result) => {
                        if (err) {
                            console.error("Database error:", err);
                            return res.status(500).json({ 
                                success: false, 
                                message: "Error al eliminar la venta" 
                            });
                        }
                        
                        if (result.affectedRows === 0) {
                            return res.status(404).json({ 
                                success: false, 
                                message: "Venta no encontrada" 
                            });
                        }
                        
                        return res.json({ 
                            success: true, 
                            message: "Venta eliminada correctamente",
                            deletedId: id
                        });
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