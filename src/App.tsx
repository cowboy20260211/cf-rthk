import { Routes, Route } from 'react-router-dom';
import Layout from './components/Common/Layout';
import Home from './pages/index/Home';
import Live from './pages/live/Live';
import Programs from './pages/programs/Programs';
import ProgramDetail from './pages/programs/ProgramDetail';
import Favorites from './pages/favorites/Favorites';
import Profile from './pages/profile/Profile';
import TestArchiveApi from './pages/TestArchiveApi';
import TestEpisodeApi from './pages/TestEpisodeApi';
import TestPopularApi from './pages/TestPopularApi';
import TestScheduleApi from './pages/TestScheduleApi';
import { PlayerProvider } from './stores/PlayerContext';
import { FavoriteProvider } from './stores/FavoriteContext';

function App() {
  return (
    <FavoriteProvider>
      <PlayerProvider>
        <Layout>
          <Routes>
            <Route path='/' element={<Home />} />
            <Route path='/live' element={<Live />} />
            <Route path='/programs' element={<Programs />} />
            <Route path='/programs/:channel/:id' element={<ProgramDetail />} />
            <Route path='/favorites' element={<Favorites />} />
            <Route path='/profile' element={<Profile />} />
            <Route path='/test-archive' element={<TestArchiveApi />} />
            <Route path='/test-episode' element={<TestEpisodeApi />} />
            <Route path='/test-popular' element={<TestPopularApi />} />
            <Route path='/test-schedule' element={<TestScheduleApi />} />
          </Routes>
        </Layout>
      </PlayerProvider>
    </FavoriteProvider>
  );
}

export default App;
