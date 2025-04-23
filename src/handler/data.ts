import { Request, Response } from 'express';
import DataController from '../controller/data';

const dataController = new DataController();

class DataHttphHandler{

    rootHandler = (_req: Request, res: Response): void => {
        console.log("Bienvenido");
        res.send("Bienvenido al backend");
    };

    ventasHandler = dataController.getVentas;

    clientesHandler = dataController.getClientes;
    
    addClienteHandler = (req: Request, res: Response): void => {
        dataController.addCliente(req, res);
    };

    deleteClienteHandler = (req: Request, res: Response): void => {
        dataController.deleteCliente(req, res);
    };

    productosHandler = dataController.getProductos;

    negociacionesHandler = dataController.getNegociaciones;
    updateNegociacionesHandler = (req: Request, res: Response) => dataController.updateNegociacion(req, res);


    empresasHandler = dataController.getEmpresas;
    addempresaHandler = dataController.addEmpresa;
    deleteempresaHandler = dataController.deleteEmpresa;

    loginHandler = dataController.loginUser;
}

export default DataHttphHandler;
