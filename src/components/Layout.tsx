import { NavLink, Outlet } from "react-router-dom";
import "../styles/layout.css";

function Layout() {
  return (
    <>
      <header className="site-header">
        <NavLink to="/" className="site-logo">
          PolyPlanner
        </NavLink>

        <nav aria-label="Main navigation">
          <ul className="nav-links">
            <li>
              <NavLink
                to="/"
                end
                className={({ isActive }) => (isActive ? "active" : "")}
              >
                Home
              </NavLink>
            </li>

            <li>
              <NavLink
                to="/planner"
                className={({ isActive }) => (isActive ? "active" : "")}
              >
                Planner
              </NavLink>
            </li>
          </ul>
        </nav>
      </header>

      <main>
        <Outlet />
      </main>
    </>
  );
}

export default Layout;