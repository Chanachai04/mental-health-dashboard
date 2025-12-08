import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

app.listen(5151, () => {
  console.log("Server is running on port 5151");
});
