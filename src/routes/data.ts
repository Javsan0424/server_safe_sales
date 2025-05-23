import { Router } from 'express';
import DataHttphHandler from '../handler/data';

const dataHttphHandler = new DataHttphHandler();

const router = Router();

router.get('/', dataHttphHandler.rootHandler);

router.get('/api/ventas', dataHttphHandler.ventasHandler);
router.post('/api/ventas', dataHttphHandler.addVentasHanlder);
router.delete('/api/ventas/:id', dataHttphHandler.deleteVentasHanlder);
router.put('/api/ventas/:id', dataHttphHandler.updateVentasHandler);


router.get('/api/clientes', dataHttphHandler.clientesHandler);
router.post('/api/clientes', dataHttphHandler.addClienteHandler);
router.delete('/api/clientes/:id', dataHttphHandler.deleteClienteHandler);


router.get('/api/productos', dataHttphHandler.productosHandler);
router.post('/api/productos', dataHttphHandler.addProductosHandler);
router.delete('/api/productos/:id', dataHttphHandler.deleteProductosHandler);
router.put('/api/productos/:id', dataHttphHandler.updateProductosHandler);


router.get('/api/negociaciones', dataHttphHandler.negociacionesHandler);
router.post('/api/negociaciones', dataHttphHandler.addNegociacionHandler)
router.put('/api/negociaciones/:id', dataHttphHandler.updateNegociacionesHandler)


router.get('/api/empresas', dataHttphHandler.empresasHandler);
router.post('/api/empresas', dataHttphHandler.addempresaHandler);
router.delete('/api/empresas/:id', dataHttphHandler.deleteempresaHandler);

router.post('/api/login', dataHttphHandler.loginHandler);

export default router;
