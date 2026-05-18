import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Welcome } from "./pages/Welcome";
import { Collections } from "./pages/Collections";
import { PaintingDetail } from "./pages/PaintingDetail";
import { About } from "./pages/About";
import "./styles/global.css";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/collections" element={<Collections />} />
        <Route path="/collections/:id" element={<PaintingDetail />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </BrowserRouter>
  );
}
