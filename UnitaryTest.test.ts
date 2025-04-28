import { Request, Response } from 'express';
import DataController from './src/controller/data';
import { db } from './src/database/db'; 
import { RowDataPacket, OkPacket, ResultSetHeader } from 'mysql2';

jest.mock('./src/database/db', () => ({
  db: {
    query: jest.fn(),
  }
}));

describe('DataController', () => {
  let controller: DataController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseJson: jest.Mock;
  let responseStatus: jest.Mock;

  beforeEach(() => {
    controller = new DataController();
    mockRequest = {};
    responseJson = jest.fn();
    responseStatus = jest.fn(() => ({ json: responseJson, send: responseJson }));
    mockResponse = {
      status: responseStatus,
      json: responseJson,
      send: responseJson,
    };

    jest.clearAllMocks();
  });

  describe('handleQuery', () => {
    it('should handle successful query', async () => {
      const mockResult = [{ id: 1, name: 'Test' }];
      (db.query as jest.Mock).mockImplementation((query, params, callback) => {
        callback(null, mockResult);
      });

      await controller.handleQuery('SELECT * FROM Test', mockResponse as Response);

      expect(db.query).toHaveBeenCalled();
      expect(responseJson).toHaveBeenCalledWith(mockResult);
    });

    it('should handle query error', async () => {
      const mockError = new Error('Database error');
      (db.query as jest.Mock).mockImplementation((query, params, callback) => {
        callback(mockError, null);
      });

      await controller.handleQuery('SELECT * FROM Test', mockResponse as Response);

      expect(db.query).toHaveBeenCalled();
      expect(responseStatus).toHaveBeenCalledWith(500);
      expect(responseJson).toHaveBeenCalledWith('Error en la consulta a la base de datos');
    });
  });

  describe('getVentas', () => {
    it('should call handleQuery with correct SQL', async () => {
      const handleQuerySpy = jest.spyOn(controller, 'handleQuery').mockImplementationOnce(() => {});

      await controller.getVentas(mockRequest as Request, mockResponse as Response);
      expect(handleQuerySpy).toHaveBeenCalledWith('SELECT * FROM Ventas', mockResponse);
    });
  });

  describe('addNegociacion', () => {
    it('should validate required fields', async () => {
      mockRequest.body = {};
      await controller.addNegociacion(mockRequest as Request, mockResponse as Response);
      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        message: "Cliente_ID es un campo obligatorio y debe ser un número válido"
      });
    });

    it('should create negociacion with default values', async () => {
      mockRequest.body = { Cliente_ID: 1 };
      const mockResult = { affectedRows: 1, insertId: 123 } as ResultSetHeader;
      
      (db.query as jest.Mock).mockImplementation((query, params, callback) => {
        callback(null, mockResult);
      });

      await controller.addNegociacion(mockRequest as Request, mockResponse as Response);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO Negociaciones'),
        [1, expect.any(String), "Iniciado"],
        expect.any(Function)
      );
      expect(responseStatus).toHaveBeenCalledWith(201);
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        message: "Negociación creada correctamente",
        negociacionId: 123
      });
    });
  });

  describe('updateNegociacion', () => {
    it('should validate status', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.body = { Estatus: 'Invalid' };
  
      await controller.updateNegociacion(mockRequest as Request, mockResponse as Response);
  
      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining("Estatus inválido")
      });
    });
  
    it('should update with fecha_cierre for terminal statuses', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.body = { Estatus: 'Terminado' };
  
      const mockResult = { affectedRows: 1 } as OkPacket;
  
      (db.query as jest.Mock).mockImplementation((query, params, callback) => {
        callback(null, mockResult);
      });
  
      await controller.updateNegociacion(mockRequest as Request, mockResponse as Response);
  
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE Negociaciones'),
        [expect.any(String), 'Terminado', '1'], // <-- notice '1' as string
        expect.any(Function)
      );
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        message: "Negociación actualizada correctamente",
        data: expect.anything()
      });
    });
  });

  describe('addProducto', () => {
    it('should validate required fields', async () => {
      mockRequest.body = {};
      await controller.addProducto(mockRequest as Request, mockResponse as Response);
      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        message: "Nombre y Categoría son campos obligatorios"
      });
    });

    it('should handle successful product creation', async () => {
      mockRequest.body = {
        Nombre: 'Test',
        Precio: '10.99',
        Stock: '5',
        Categoria: 'Test'
      };
      const mockResult = { affectedRows: 1, insertId: 456 } as ResultSetHeader;
      
      (db.query as jest.Mock).mockImplementation((query, params, callback) => {
        callback(null, mockResult);
      });

      await controller.addProducto(mockRequest as Request, mockResponse as Response);

      expect(db.query).toHaveBeenCalled();
      expect(responseStatus).toHaveBeenCalledWith(201);
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        message: "Producto agregado correctamente",
        productId: 456,
        product: expect.anything()
      });
    });
  });

  describe('addVenta', () => {
    it('should validate required fields', async () => {
      mockRequest.body = {};
      await controller.addVenta(mockRequest as Request, mockResponse as Response);
      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining("son campos obligatorios")
      });
    });

    it('should validate payment method', async () => {
      mockRequest.body = {
        Cliente_ID: 1,
        Producto_ID: 1,
        Fecha: '2023-01-01',
        Metodo_pago: 'Invalid',
        Estado_pago: 'Pagado',
        Total: 100
      };
      await controller.addVenta(mockRequest as Request, mockResponse as Response);
      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining("Método de pago inválido")
      });
    });

    it('should create venta successfully', async () => {
      mockRequest.body = {
        Cliente_ID: 1,
        Producto_ID: 1,
        Comision: 10,
        Fecha: '2023-01-01',
        Metodo_pago: 'Efectivo',
        Estado_pago: 'Pagado',
        Total: 100
      };
      const mockResult = { affectedRows: 1, insertId: 789 } as ResultSetHeader;
      
      (db.query as jest.Mock).mockImplementation((query, params, callback) => {
        callback(null, mockResult);
      });

      await controller.addVenta(mockRequest as Request, mockResponse as Response);

      expect(db.query).toHaveBeenCalled();
      expect(responseStatus).toHaveBeenCalledWith(201);
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        message: "Venta registrada correctamente",
        ventaId: 789
      });
    });
  });

  describe('deleteCliente', () => {
    it('should validate client ID', async () => {
      mockRequest.params = { id: 'invalid' };
      await controller.deleteCliente(mockRequest as Request, mockResponse as Response);
      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        message: "ID de cliente no válido"
      });
    });

    it('should check for existing relations', async () => {
      mockRequest.params = { id: '1' };
      const mockClientResult = [{ Cliente_ID: 1 }] as RowDataPacket[];
      const mockRelationsResult = [{ existe: 1 }] as RowDataPacket[];
      
      (db.query as jest.Mock)
        .mockImplementationOnce((query, params, callback) => {
          callback(null, mockClientResult);
        })
        .mockImplementationOnce((query, params, callback) => {
          callback(null, mockRelationsResult);
        });

      await controller.deleteCliente(mockRequest as Request, mockResponse as Response);

      expect(db.query).toHaveBeenCalledTimes(2);
      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining("tiene negociaciones o ventas asociadas")
      });
    });
  });

  describe('loginUser', () => {
    it('should validate credentials', async () => {
      mockRequest.body = {};
      await controller.loginUser(mockRequest as Request, mockResponse as Response);
      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        message: "Email y contraseña son requeridos"
      });
    });

    it('should handle successful login', async () => {
      mockRequest.body = { email: 'test@test.com', password: 'password' };
      const mockResult = [{ email: 'test@test.com' }] as RowDataPacket[];
      
      (db.query as jest.Mock).mockImplementation((query, params, callback) => {
        callback(null, mockResult);
      });

      await controller.loginUser(mockRequest as Request, mockResponse as Response);

      expect(db.query).toHaveBeenCalledWith(
        'SELECT * FROM Cuenta_Valida WHERE email = ? AND password = ?',
        ['test@test.com', 'password'],
        expect.any(Function)
      );
      expect(responseJson).toHaveBeenCalledWith({ success: true });
    });
  });
});
