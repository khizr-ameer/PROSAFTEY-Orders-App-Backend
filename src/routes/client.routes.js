const router = require("express").Router();
const controller = require("../controllers/client.controller"); 

router.post("/", controller.createClient);
router.get("/", controller.getClients);            
router.get("/:id", controller.getClientById);
router.put("/:id", controller.updateClient);
router.delete("/:id", controller.deleteClient);

module.exports = router;
