import { collection, doc, getDocs, onSnapshot } from 'firebase/firestore';
import Medal from '../assets/medal.png';
import { firestore } from '../firebase';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function Leaderboard() {
  const sessionID = useParams().sessionID ?? '';
  const [rankings, setRankings] = useState<leaderboardEntry[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      setRankings(await getRankings());
    })();
    const unsubscribe = onSnapshot(doc(firestore, 'sessions', sessionID), (doc) => {
      const currentLevel = doc.data()?.currentLevel;
      console.log('currentLevel: ', currentLevel);
      if (currentLevel > 0) {
        navigate(`/level/${sessionID}/${currentLevel}`);
      }
    });
    return () => unsubscribe();
  }, []);

  type leaderboardEntry = [teamNumber: number, balance: number];
  async function getRankings() {
    const leaderboardEntries: leaderboardEntry[] = [];
    const colRef = collection(firestore, 'sessions', sessionID, 'teams');
    await getDocs(colRef).then((snapshot) => {
      snapshot.forEach((doc) => leaderboardEntries.push([Number(doc.id), doc.data()?.balance]));
    });
    return leaderboardEntries.sort((a, b) => b[1] - a[1]);
  }

  return (
    <div className='modal'>
      <div className='leaderboard_modal'>
        <div className='leaderboard_heading'>
          <img src={Medal} />
          <h1 style={{ fontSize: 50 }}>LEADERBOARD</h1>
          <img src={Medal} />
        </div>
        <ul className='list-none'>
          {rankings.map(([teamNumber, balance]) => (
            <li key={teamNumber}>
              {'Team ' + teamNumber}: £{balance}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
