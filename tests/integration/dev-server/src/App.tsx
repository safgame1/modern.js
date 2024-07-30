import { BrowserRouter, Link, Route, Routes, Outlet } from 'react-router-dom';

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route
        path="/"
        element={
          <div className="page">
            home
            <div>
              <Link to="/a">A</Link>
            </div>
            <div>
              <Link to="/b">B</Link>
            </div>
            <Outlet />
          </div>
        }
      />
      <Route path="/a" element={<div className="page">A</div>} />
      <Route path="/b" element={<div className="page">B</div>} />
    </Routes>
  </BrowserRouter>
);

export default App;
