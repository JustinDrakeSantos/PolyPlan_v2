import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Eisenhower from "./pages/Eisenhower";
import Flashcards from "./pages/Flashcards.tsx";
import Study from "./pages/Study.tsx";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/planner" element={<Eisenhower />} />
        <Route path="/flashcards" element={<Flashcards/>}/>
        <Route path="/study" element={<Study/>}/>
      </Route>
    </Routes>
  );
}

export default App;