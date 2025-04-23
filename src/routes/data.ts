import { Router } from 'express';
import DataHttphHandler from '../handler/data';

const dataHttphHandler = new DataHttphHandler();

const router = Router();

router.get('/', dataHttphHandler.rootHandler);
router.get('/api/ventas', dataHttphHandler.ventasHandler);


router.get('/api/clientes', dataHttphHandler.clientesHandler);
router.post('/api/clientes', dataHttphHandler.addClienteHandler);
router.delete('/api/clientes/:id', dataHttphHandler.deleteClienteHandler);



router.get('/api/productos', dataHttphHandler.productosHandler);
router.post('/api/productos', dataHttphHandler.addProductosHandler);
router.delete('/api/productos/:id', dataHttphHandler.deleteProductosHandler);
router.put('/api/productos/:id', dataHttphHandler.updateProductosHandler)


router.get('/api/negociaciones', dataHttphHandler.negociacionesHandler);


router.get('/api/empresas', dataHttphHandler.empresasHandler);
router.post('/api/empresas', dataHttphHandler.addempresaHandler);
router.delete('/api/empresas/:id', dataHttphHandler.deleteempresaHandler);

router.post('/api/login', dataHttphHandler.loginHandler);

export default router;
