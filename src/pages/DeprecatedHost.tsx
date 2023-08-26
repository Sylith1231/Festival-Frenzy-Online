import { useParams } from 'react-router-dom';
import { firestore } from '../firebase.ts';
import { useEffect, useState } from 'react';
import { collection, doc, getDocs, onSnapshot, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import festivalData from '../data/FestivalData.json';

export default function Host() {
  const sessionID = useParams().sessionID ?? '';
  const [users, setUsers] = useState<string[]>([]);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [orderSubmitted, setOrderSubmitted] = useState<string[]>([]);
  const [dieRolls, setDieRolls] = useState<number[]>([-1, -1]);
  const levelData = festivalData[currentLevel - 1] as levelData;
  const [code, setCode] = useState('');
  const [activeButton, setActiveButton] = useState(1);
  // const allOrdersSubmitted = users.sort().join(',') === orderSubmitted.sort().join(',');

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(firestore, 'sessions', sessionID), (doc) => {
      const data = doc.data();
      if (!data) console.log('error');
      else {
        setUsers(data.users ?? []);
        setOrderSubmitted(data.orderSubmitted ?? []);
        setCode(data.code);
      }
    });
    return () => unsubscribe();
  }, []);

  async function handleStartGame() {
    const docRef = doc(firestore, 'sessions', sessionID);
    const batch = writeBatch(firestore);
    //add all users to the game
    users.forEach((user) => {
      const docRef = doc(firestore, 'sessions', sessionID, 'players', user);
      batch.set(docRef, { balance: 100, orders: {} });
    });
    await batch.commit();
    await updateDoc(docRef, { gameStarted: true });
    setActiveButton(2);
  }

  return (
    <div>
      <h1 style={{ display: 'block' }}>Current Users</h1>
      <h5 style={{ display: 'block' }}>Red font = order not submitted. Green = order submitted.</h5>
      <ol>
        {users.map((user) => (
          <li key={user} style={{ color: orderSubmitted.includes(user) ? 'green' : 'red' }}>
            {user}
          </li>
        ))}
      </ol>
      <div style={{ display: 'flex', flexDirection: 'column', rowGap: '18px', marginLeft: '18px' }}>
        <div style={{ display: 'flex', columnGap: '18px' }}>
          <button onClick={handleStartGame} disabled={activeButton != 1 || users.length <= 0} style={{ cursor: 'pointer' }}>
            <h2>START GAME</h2>
          </button>
          <p>Click to navigate players to first round. Only players shown in 'Current Users' will be able to participate.</p>
        </div>
        <div style={{ display: 'flex', columnGap: '18px' }}>
          <button
            onClick={async () => {
              const newDieRolls = [Math.floor(Math.random() * 6), Math.floor(Math.random() * 6)];
              setDieRolls(newDieRolls);
              await updateDoc(doc(firestore, 'sessions', sessionID), {
                [`dieValues.${currentLevel}`]: newDieRolls,
              });
              setActiveButton(3);
            }}
            style={{ cursor: 'pointer' }}
            disabled={activeButton != 2 || orderSubmitted.length != users.length}
          >
            <h2>ROLL DICE!</h2>
          </button>
          <p>Click to start dice roll animation on user's screens.</p>
        </div>
        <div style={{ display: 'flex', columnGap: '18px' }}>
          <button
            onClick={async () => {
              let nextLevel;
              if (currentLevel > 0) {
                await updateScores(sessionID, levelData, dieRolls, currentLevel);
                nextLevel = -currentLevel;
              } else {
                nextLevel = -(currentLevel - 1);
              }
              // const currentLevel = await getDoc(doc(firestore, 'sessions', sessionID)).then((doc) => doc.data()?.currentLevel);
              await updateDoc(doc(firestore, 'sessions', sessionID), {
                currentLevel: nextLevel,
                orderSubmitted: [],
              });
              setCurrentLevel(nextLevel);
              if (nextLevel > 0) setActiveButton(2);
            }}
            disabled={activeButton != 3}
            style={{ cursor: 'pointer' }}
          >
            <h2>Next level</h2>
          </button>
          <p>Click to update user's scores and navigate to leaderboard. Click again to navigate from leaderboard to next level.</p>
        </div>
        <div style={{ display: 'flex', columnGap: '18px' }}>
          <button
            onClick={async () => {
              await setDoc(doc(firestore, 'sessions', sessionID), {
                active: true,
                code: code,
                currentLevel: 1,
              });
              setActiveButton(1);
            }}
          >
            <h2>Restart game.</h2>
          </button>
          <p>Click this if you make a mistake. Afterwards, all users need to begin again from the landing page.</p>
        </div>
        <h1>Code: {code}</h1>
      </div>
    </div>
  );
}

interface levelData {
  level: number;
  name: string;
  prices: {
    welliesCost: number;
    sunglassesCost: number;
    sellWelliesBW: number;
    sellWelliesGW: number;
    sellSunglassesGW: number;
    sellSunglassesBW: number;
  };
  weather: (0 | 1)[];
  image: string;
}

async function updateScores(sessionID: string, levelData: levelData, dieRolls: number[], currentLevel: number) {
  const batch = writeBatch(firestore);
  const colRef = collection(firestore, 'sessions', sessionID, 'players');
  const snapshot = await getDocs(colRef);
  snapshot.forEach((doc) => {
    let welliesSellPrice, sunglassesSellPrice;
    const docRef = doc.ref;
    const data = doc.data();
    if (levelData.weather[dieRolls[0] + dieRolls[1]] == 0) {
      welliesSellPrice = levelData.prices.sellWelliesBW;
      sunglassesSellPrice = levelData.prices.sellSunglassesBW;
    } else {
      welliesSellPrice = levelData.prices.sellWelliesGW;
      sunglassesSellPrice = levelData.prices.sellSunglassesGW;
    }
    // const { welliesQty, sunglassesQty } = data.orders[currentLevel];
    const { welliesQty, sunglassesQty } = data.orders[currentLevel];
    const balance = data.balance;
    batch.update(docRef, {
      balance: balance + welliesQty * welliesSellPrice + sunglassesQty * sunglassesSellPrice,
    });
  });
  await batch.commit();
}
