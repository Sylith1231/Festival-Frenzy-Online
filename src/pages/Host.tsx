import { useParams } from 'react-router-dom';
import { firestore } from '../firebase.ts';
import { useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs, onSnapshot, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import festivalData from '../data/FestivalData.json';

export default function Host() {
  const sessionID = useParams().sessionID ?? '';
  const [users, setUsers] = useState<string[]>([]);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [orderSubmitted, setOrderSubmitted] = useState<string[]>([]);
  const [dieRolls, setDieRolls] = useState<number[]>([-1, -1]);
  const levelData = festivalData[Math.floor(currentLevel / 2)];
  // const allOrdersSubmitted = users.sort().join(',') === orderSubmitted.sort().join(',');

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(firestore, 'sessions', sessionID), (doc) => {
      const data = doc.data();
      if (!data) console.log('error');
      else {
        setUsers(data.users ?? []);
        setOrderSubmitted(data.orderSubmitted ?? []);
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
  }
  console.log('currentLevel: ', currentLevel);
  return (
    <div>
      <h1>Current Users</h1>
      <ol>
        {users.map((user) => (
          <li key={user} style={{ color: orderSubmitted.includes(user) ? 'green' : 'red' }}>
            {user}
          </li>
        ))}
      </ol>
      <button onClick={handleStartGame}>
        <h2>START GAME</h2>
      </button>
      <button
        onClick={() => {
          const newDieRolls = [Math.floor(Math.random() * 6), Math.floor(Math.random() * 6)];
          setDieRolls(newDieRolls);
          updateDoc(doc(firestore, 'sessions', sessionID), {
            [`dieValues.${currentLevel}`]: newDieRolls,
          });
        }}
      >
        <h2>ROLL DICE!</h2>
      </button>
      <button
        onClick={async () => {
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
        }}
      >
        <h2>UPDATE SCORES!</h2>
      </button>
      <button
        onClick={async () => {
          // const currentLevel = await getDoc(doc(firestore, 'sessions', sessionID)).then((doc) => doc.data()?.currentLevel);
          await updateDoc(doc(firestore, 'sessions', sessionID), {
            currentLevel: currentLevel + 1,
          });
          setCurrentLevel(currentLevel + 1);
        }}
      >
        <h2>Next level</h2>
      </button>
      <button
        onClick={async () => {
          const currentLevel = await getDoc(doc(firestore, 'sessions', sessionID)).then((doc) => doc.data()?.currentLevel);
          await updateDoc(doc(firestore, 'sessions', sessionID), {
            currentLevel: currentLevel - 1,
          });
        }}
      >
        <h2>Previous level</h2>
      </button>
      <button
        onClick={async () => {
          await setDoc(doc(firestore, 'sessions', sessionID), {
            active: true,
            code: '219797',
            currentLevel: 1,
          });
        }}
      >
        <h2>Restart game.</h2>
      </button>
    </div>
  );
}
