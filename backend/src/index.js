import dotenv from "dotenv";
dotenv.config({ path: "../.env" });
import express from "express";
import customersRouter from "./routes/customers.js";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use("/api/customers", customersRouter);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});