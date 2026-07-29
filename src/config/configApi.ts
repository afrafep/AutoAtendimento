import axios from "axios";

const api = axios.create({
  baseURL: "/api/sisclinic",
});

export { api };
