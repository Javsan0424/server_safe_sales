import { Request, Response } from 'express';
import DataController from '../controller/data';

const dataController = new DataController();

class DataHttphHandler{

    rootHandler = (_req: Request, res: Response): void => {
        console.log("Bienvenido");
        res.send("Bienvenido al backend");
    };

    ventasHandler = dataController.getVentas;
    addVentasHanlder = (req: Request, res: Response): void => {
        dataController.addVenta(req, res);
    };
    deleteVentasHanlder = (req: Request, res: Response): void => {
        dataController.deleteVenta(req, res);
    };
    
    updateVentasHandler = (req: Request, res: Response): void => {
        dataController.updateVenta(req, res);
    };

    clientesHandler = dataController.getClientes;
    addClienteHandler = (req: Request, res: Response): void => {
        dataController.addCliente(req, res);
    };
    deleteClienteHandler = (req: Request, res: Response): void => {
        dataController.deleteCliente(req, res);
    };

    productosHandler = dataController.getProductos;
    addProductosHandler = (req: Request, res: Response): void => {
        dataController.addProducto(req, res);
    };
    deleteProductosHandler = (req: Request, res: Response): void => {
        dataController.deleteProducto(req, res);
    };
    updateProductosHandler = (req: Request, res: Response): void => {
        dataController.updateProducto(req, res);
    };


    negociacionesHandler = dataController.getNegociaciones;
    addNegociacionHandler = (req: Request, res: Response): void => {
        dataController.addNegociacion(req, res);
    };
    updateNegociacionesHandler = (req: Request, res: Response): void => {
        dataController.updateNegociacion(req, res);
    };


    empresasHandler = dataController.getEmpresas;
    addempresaHandler = dataController.addEmpresa;
    deleteempresaHandler = dataController.deleteEmpresa;

    loginHandler = dataController.loginUser;
}

export default DataHttphHandler;
