import { Router } from "express";
import { success } from "zod";
const router = Router();
/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check
 *     responses:
 *       200:
 *         description: OK
 */
router.get("/health",(req,res)=>{
  res.json({
    success:true,
    message:"OK",
    data:{
      uptime: process.uptime()
    }
  })
});
export default router;