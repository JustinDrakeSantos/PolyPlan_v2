import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Eisenhower from "./pages/Eisenhower";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/planner" element={<Eisenhower />} />
      </Route>
    </Routes>
  );
}

export default App;