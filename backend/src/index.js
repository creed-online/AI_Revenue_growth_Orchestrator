import dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

import express from "express";


//Express Server
const app = express();

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});