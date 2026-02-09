import { Routes, Route } from 'react-router-dom';
import Layout from './components/Common/Layout';
import Home from './pages/index/Home';
import Live from './pages/live/Live';
import Programs from './pages/programs/Programs';
import ProgramDetail from './pages/programs/ProgramDetail';
import Favorites from './pages/favorites/Favorites';
import Profile from './pages/profile/Profile';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/live" element={<Live />} />
        <Route path="/programs" element={<Programs />} />
        <Route path="/programs/:channel/:id" element={<ProgramDetail />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </Layout>
  );
}

export default App;
