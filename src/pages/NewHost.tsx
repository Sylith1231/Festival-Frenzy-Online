//TODO
/*
  -Name changes after game started.
  -Dealing with player removal properly on backend.
  -Dealing with players joining after game started.
  -Ensure allow new users switch works properly.
*/

import Sun from '../assets/sun.png';
import Rain from '../assets/rain.jpeg';
import { arrayRemove, arrayUnion, collection, doc, getDocs, onSnapshot, query, updateDoc, where, writeBatch } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { firestore } from '../firebase';
import { useParams } from 'react-router-dom';
import { MdCasino, MdClose, MdDone, MdNavigateNext, MdPersonRemove, MdRestartAlt, MdRocketLaunch } from 'react-icons/md';
import { IconContext } from 'react-icons';
import festivalData from '../data/FestivalData.json';
import Switch from 'react-switch';
import { calculateWeatherProbability } from '../utilities/calculateWeatherProbability';

export default function NewHost() {
  const [users, setUsers] = useState<string[] | null>(null);

  //Consider changing to <boolean|null> (think about loading component if any state is null).
  const [allowNewUsers, setAllowNewUsers] = useState<boolean>(true);
  const [currentLevel, setCurrentLevel] = useState<number | null>(null);
  const [ordersSubmitted, setOrdersSubmitted] = useState<string[] | null>(null);
  const levelData = currentLevel ? (festivalData[currentLevel - 1] as levelData) : null;
  const [activeButton, setActiveButton] = useState<number>(0);
  const [code, setCode] = useState<string | null>(null);
  const [removePlayer, setRemovePlayer] = useState<string | null>(null);
  //TODO deal with sessionID not being defined.
  const sessionID = useParams().sessionID ?? '';

  useEffect(() => {
    const docRef = doc(firestore, 'sessions', sessionID);
    //TODO look into whether I shouould be performing all these updates in the same onSnapshot?
    //I.e. should I be using a different listener for each piece of state? StackOverflow.
    const unsubscribe = onSnapshot(docRef, (doc) => {
      const data = doc.data();
      if (data) {
        setUsers(data.users ?? null);
        setAllowNewUsers(data.allowNewUsers ?? null);
        setCurrentLevel(data.currentLevel ?? null);
        setOrdersSubmitted(data.ordersSubmitted ?? null);
        setCode(data.code ?? null);
        if (data.gameStarted == false) {
          setActiveButton(1);
        } else {
          if (data.dieValues[data.currentLevel] || data.currentLevel < 0) {
            setActiveButton(3);
          } else {
            setActiveButton(2);
          }
        }
      } else {
        //TODO deal with error.
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  async function handleStartGame() {
    const docRef = doc(firestore, 'sessions', sessionID);
    const batch = writeBatch(firestore);
    users?.forEach((user) => {
      batch.set(doc(docRef, 'players', user), { balance: 100, orders: {} });
    });
    batch.update(docRef, { gameStarted: true, currentLevel: 1, allowNewUsers: false, ordersSubmitted: [] });
    await batch
      .commit()
      .then(() => {
        setActiveButton(2);
      })
      .catch((error) => {
        console.log('error🤪: ', error);
      });
  }

  async function autofillOrders() {
    const orderNotSubmitted = users?.filter((user) => !ordersSubmitted?.includes(user));
    const colRef = collection(firestore, 'sessions', sessionID, 'players');
    //TODO ask if this is okay and for more info on stack overflow.
    const q = query(colRef, where('__name__', 'in', orderNotSubmitted));
    const querySnapshot = await getDocs(q);
    const batch = writeBatch(firestore);
    querySnapshot.forEach((doc) => {
      const balance = doc.data().balance;
      console.log(doc.id);
      batch.update(doc.ref, {
        [`orders.${currentLevel}`]: {
          startBalance: balance,
          endBalance: balance,
          ordersSubmitted: true,
          welliesQty: 0,
          sunglassesQty: 0,
        },
      });
    });
    await batch.commit();
  }
  async function handleRollDice() {
    const diceRolls = [Math.floor(Math.random() * 6), Math.floor(Math.random() * 6)];

    await autofillOrders();

    await updateBalances(diceRolls)
      .then(() => {
        setActiveButton(3);
      })
      .catch((error) => {
        console.log('error🤯: ', error);
      });
  }

  async function handleNext() {
    const nextLevel = currentLevel! > 0 ? -currentLevel! : -(currentLevel! - 1);
    const docRef = doc(firestore, 'sessions', sessionID);
    await updateDoc(docRef, { currentLevel: nextLevel, ordersSubmitted: [] });
  }

  async function updateBalances(diceRolls: number[]) {
    const batch = writeBatch(firestore);
    batch.update(doc(firestore, 'sessions', sessionID), {
      [`dieValues.${currentLevel}`]: diceRolls,
    });
    const snapshot = await getDocs(collection(firestore, 'sessions', sessionID, 'players'));
    const goodWeather = levelData?.weather[diceRolls[0] + diceRolls[1]] == 1;
    snapshot.forEach((doc) => {
      const data = doc.data();
      const balance = data.balance;
      const order = data.orders[currentLevel!];
      if (goodWeather) {
        batch.update(doc.ref, {
          balance: balance + order.welliesQty * levelData.prices.sellWelliesGW + order.sunglassesQty * levelData.prices.sellSunglassesGW,
        });
      } else {
        batch.update(doc.ref, {
          balance: balance + order.welliesQty * levelData!.prices.sellWelliesBW + order.sunglassesQty * levelData!.prices.sellSunglassesBW,
        });
      }
    });
    await batch.commit();
  }

  //TODO Implement checks for whether state is null, and implement loading either for subcomponents or entire page.
  return (
    /* Grey background div */
    <>
      <div className='flex items-center justify-center h-full w-full bg-gray-100'>
        <div className='flex gap-x-4'>
          {/* Players / Leaderboard Section */}
          <div className='bg-white rounded-xl p-4'>
            <p className='m-0 text-2xl text-gray-800 font-bold'>Players</p>
            <ul className='h-full list-none p-0'>{users ? users.sort().map((user) => <PlayerEntry key={user} username={user} sessionID={sessionID} orderSubmitted={currentLevel! <= 0 ? null : ordersSubmitted?.includes(user)} setRemovePlayer={setRemovePlayer} />) : 'TODO ERROR'}</ul>
          </div>
          {/* Session Data / Festival Data */}
          <div className='flex flex-col gap-y-4'>
            <div className='flex gap-x-4'>
              {/* Session Data */}
              <div className='flex-none flex flex-col w-fit h-fit gap-y-3 bg-white p-4 px-4 rounded-xl'>
                <p className='m-0 text-2xl text-gray-800 font-bold'>Session ({sessionID})</p>
                <div className='flex items-center'>
                  <p className='m-0 text-md italic'>
                    Code: <span className='underline text-sky-500'>{code}</span>
                  </p>
                  <div className='mx-2 border border-solid border-transparent border-l-gray-300 h-4' />
                  <p className='m-0 italic text-md'>{users?.length ?? 0} players</p>
                  <div className='mx-2 border border-solid border-transparent border-l-gray-300 h-4' />
                  <p className={`m-0 italic text-md ${currentLevel == 0 ? 'text-red-500' : 'text-[#4CAF50]'}`}>{currentLevel == 0 ? 'waiting room' : 'in progress'}</p>
                </div>
                <div className='mt-2 flex items-center gap-x-2'>
                  <p className='m-0 text-md'>Allow players to join: </p>
                  <Switch checked={allowNewUsers} onChange={(checked) => setAllowNewUsers(checked)} onColor='#38bdf8' offColor='#ef4444' activeBoxShadow='' height={28 * 0.8} width={56 * 1 * 0.8} handleDiameter={24 * 0.8} />
                </div>
              </div>
              {/* Buttons */}
              <div className='flex w-full gap-x-2'>
                <div className='w-full flex flex-col gap-y-2'>
                  <button onClick={handleStartGame} disabled={activeButton != 1} className={`flex disabled:border-gray-200 disabled:bg-gray-100 items-center justify-center gap-x-2 border-2 border-solid border-[#4CAF50] cursor-pointer disabled:cursor-default  bg-white hover:bg-[#E8F5E9] rounded-lg h-full`}>
                    <p className={`${activeButton != 1 && 'text-gray-300'} m-0 font-bold text-lg text-[#4CAF50]`}>Start Game</p>
                    <IconContext.Provider value={{ color: `${activeButton != 1 ? '#D1D5DB' : '#4CAF50'}`, size: '2em' }}>
                      <MdRocketLaunch />
                    </IconContext.Provider>
                  </button>
                  <button onClick={handleNext} disabled={activeButton != 3} className={`flex disabled:border-gray-200 disabled:bg-gray-100 items-center justify-center gap-x-2 border-2 border-solid border-[#03A9F4] cursor-pointer disabled:cursor-default bg-white hover:bg-[#E1F5FE] rounded-lg h-full`}>
                    <p className={`${activeButton != 3 && 'text-gray-300'} m-0 font-bold text-lg text-[#03A9F4]`}>Next</p>
                    <IconContext.Provider value={{ color: `${activeButton != 3 ? '#D1D5DB' : '#03A9F4'}`, size: '2em' }}>
                      <MdNavigateNext />
                    </IconContext.Provider>
                  </button>
                </div>
                <div className='w-full flex flex-col gap-y-2'>
                  <button onClick={handleRollDice} disabled={activeButton != 2} className={`flex disabled:border-gray-200 disabled:bg-gray-100 items-center justify-center gap-x-2 border-2 border-solid border-[#EF5350] cursor-pointer disabled:cursor-default bg-white hover:bg-[#FFEBEE] rounded-lg h-full`}>
                    <p className={`${activeButton != 2 && 'text-gray-300'} m-0 font-bold text-lg text-[#EF5350]`}>Roll Dice</p>
                    <IconContext.Provider value={{ color: `${activeButton != 2 ? '#D1D5DB' : '#EF5350'}`, size: '2em' }}>
                      <MdCasino />
                    </IconContext.Provider>
                  </button>
                  <button disabled={activeButton != 4} className={`flex disabled:border-gray-200 disabled:bg-gray-100 items-center justify-center gap-x-2 border-2 border-solid border-[#9E9E9E] cursor-pointer disabled:cursor-default bg-white hover:bg-[#F5F5F5] rounded-lg h-full`}>
                    <p className={`${activeButton != 4 && 'text-gray-300'} m-0 font-bold text-lg text-[#9E9E9E]`}>Restart Game</p>
                    <IconContext.Provider value={{ color: `${activeButton != 4 ? '#D1D5DB' : '#9E9E9E'}`, size: '2em' }}>
                      <MdRestartAlt />
                    </IconContext.Provider>
                  </button>
                </div>
              </div>
            </div>
            {/* Festival Data */}
            <div className='h-fit rounded-xl p-4 bg-white flex flex-col gap-y-8'>
              <p className='m-0 text-2xl text-gray-800 font-bold'>Festival Data</p>
              <Forecast weather={levelData ? levelData.weather : []} />
              {/* Weather probability */}
              <div className='w-full h-[60px] flex'>
                {/*-----------------------------------------------------------------------------------------------------------------------------------------------------> I think fix bugs here by conditionally having two w-[] classes rather than just conditionally changing the contents of the square brackets in one w-[] */}
                <div className={`px-2 border-2 border-r-[1px] border-r-sky-600 border-solid border-sky-600 gap-x-4 py-2 flex items-center justify-center bg-sky-400 ${'w-[' + calculateWeatherProbability(levelData ? levelData.weather : [])[0] + ']'} rounded-l-lg`}>
                  <p className='text-sun text-4xl font-bold'>{calculateWeatherProbability(levelData ? levelData.weather : [])[0]}</p>
                  <img src={Sun} className='h-full' />
                </div>
                <div className='px-2 border-2 border-l-[1px] border-l-gray-600 border-solid border-gray-600 gap-x-4 py-2 flex items-center justify-center bg-gray-400 flex-grow rounded-r-lg'>
                  <p className='text-white text-4xl font-bold'>{calculateWeatherProbability(levelData ? levelData.weather : [])[1]}</p>
                  <img src={Rain} className='h-full' />
                </div>
              </div>
              {/* Price table */}
              <div className='flex bg-gray-100 rounded-lg border-2 border-solid border-gray-300'>
                <table className='flex-grow rounded-lg border-collapse border-spacing-0 p-0 m-0 text-center table-fixed'>
                  <thead className='rounded-xl bg-gray-100'>
                    <tr>
                      <th className='border border-solid border-transparent border-b-gray-300 border-r-gray-300 rounded-tl-lg' />
                      <th className='border border-solid border-transparent border-b-gray-300 border-r-gray-300  text-lg text-gray-800'>Cost</th>
                      <th className='border border-solid border-transparent border-b-gray-300 border-r-gray-300 text-lg text-gray-800'>Sale GW</th>
                      <th className='border border-solid border-transparent border-b-gray-300 text-lg text-gray-800 rounded-tr-lg'>Sale BW</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className='border border-solid border-transparent border-b-gray-300 border-r-gray-300 text-lg font-bold text-gray-800 bg-gray-100'>Wellies</td>
                      <td className='border border-solid border-transparent border-b-gray-300 border-r-gray-300 bg-white'>£{levelData?.prices.welliesCost}</td>
                      <td className='border border-solid border-transparent border-b-gray-300 border-r-gray-300 bg-white'>£{levelData?.prices.sellWelliesGW}</td>
                      <td className='border border-solid border-transparent border-b-gray-300 bg-white'>£{levelData?.prices.sellWelliesBW}</td>
                    </tr>
                    <tr>
                      <td className='px-4 text-lg font-bold text-gray-800 bg-gray-100 border border-solid border-transparent border-r-gray-300 rounded-bl-lg'>Sunglasses</td>
                      <td className='w-1/3 bg-white border border-solid border-transparent border-r-gray-300'>£{levelData?.prices.sunglassesCost}</td>
                      <td className='w-1/3 bg-white border border-solid border-transparent border-r-gray-300'>£{levelData?.prices.sellSunglassesGW}</td>
                      <td className='w-1/3 bg-white rounded-br-lg'>£{levelData?.prices.sellSunglassesBW}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
      <RemovePlayerModal removePlayer={removePlayer} setRemovePlayer={setRemovePlayer} sessionID={sessionID} />
    </>
  );
}

type PlayerEntryProps = {
  username: string;
  sessionID: string;
  orderSubmitted?: boolean | null;
  setRemovePlayer: React.Dispatch<React.SetStateAction<string | null>>;
};

function PlayerEntry({ username, sessionID, orderSubmitted, setRemovePlayer }: PlayerEntryProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleOnKeyUp(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      if (inputRef.current && inputRef.current?.value !== username) {
        const docRef = doc(firestore, 'sessions', sessionID);
        const newUsername = inputRef.current.value;
        const batch = writeBatch(firestore);
        batch.update(docRef, { users: arrayUnion(newUsername) });
        batch.update(docRef, { users: arrayRemove(username) });
        await batch.commit();
      }
    }
  }
  async function handleOnKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Tab') {
      if (inputRef.current && inputRef.current?.value !== username) {
        const docRef = doc(firestore, 'sessions', sessionID);
        const newUsername = inputRef.current.value;
        const batch = writeBatch(firestore);
        batch.update(docRef, { users: arrayUnion(newUsername) });
        batch.update(docRef, { users: arrayRemove(username) });
        await batch.commit();
      }
    }
  }

  function handleOnBlur() {
    if (inputRef.current && inputRef.current?.value !== username) {
      inputRef.current.value = username;
    }
  }

  return (
    <li className='flex items-center justify-center gap-x-2 mb-1'>
      {/* Disable input when game started */}
      <input ref={inputRef} onKeyDown={handleOnKeyDown} onKeyUp={handleOnKeyUp} onBlur={handleOnBlur} defaultValue={username} type='text' className={`text-center rounded border-2 border-solid ${orderSubmitted === null && 'border-gray-300'} ${orderSubmitted !== null && (orderSubmitted ? 'border-[#4CAF50]' : 'border-red-500')} px-6 py-0.5 w-20 text-base m-0`} />
      <button onClick={() => setRemovePlayer(username)} className='outline-none inline-block bg-transparent border-none p-0 cursor-pointer'>
        <IconContext.Provider value={{ color: '#F5F5F5', size: '1.8em', className: 'remove-player-icon' }}>
          <MdPersonRemove />
        </IconContext.Provider>
      </button>
    </li>
  );
}

type RemovePlayerModalProps = {
  removePlayer: string | null;
  sessionID: string;
  setRemovePlayer: React.Dispatch<React.SetStateAction<string | null>>;
};

export function RemovePlayerModal({ removePlayer, sessionID, setRemovePlayer }: RemovePlayerModalProps) {
  if (removePlayer == null) return null;

  async function handleRemovePlayer(username: string) {
    const docRef = doc(firestore, 'sessions', sessionID);
    await updateDoc(docRef, {
      users: arrayRemove(username),
    });
    setRemovePlayer(null);
  }

  return (
    <div className='z-50 fixed flex items-center justify-center inset-0 bg-black bg-opacity-80'>
      <div className='flex flex-col items-center gap-y-4 bg-white rounded-lg p-4'>
        <p className='text-lg m-0'>
          Remove <span className='underline font-bold'>{removePlayer}</span> from the session?
        </p>
        <div className='flex gap-x-2'>
          <button onClick={() => setRemovePlayer(null)} className='cursor-pointer w-[150px] bg-[#FFEBEE] border-2 border-solid border-gray-200 hover:border-[#EF5350] rounded'>
            <IconContext.Provider value={{ color: '#EF5350', size: '2.5em' }}>
              <MdClose />
            </IconContext.Provider>
          </button>
          <button onClick={() => handleRemovePlayer(removePlayer)} className='cursor-pointer w-[150px] bg-[#E8F5E9] border-2 border-solid border-gray-200 hover:border-[#4CAF50] rounded'>
            <IconContext.Provider value={{ color: '#4CAF50', size: '2.5em' }}>
              <MdDone />
            </IconContext.Provider>
          </button>
        </div>
      </div>
    </div>
  );
}

export function Forecast({ weather }: { weather: number[] }) {
  const forecast_tiles = [];
  for (let i = 0; i < 11; i++) {
    forecast_tiles.push(<ForecastTile index={i + 2} weather={weather[i]} key={`${i}`} />);
  }

  return <div className='flex gap-x-[8px] justify-center w-fit'>{forecast_tiles}</div>;
}

function ForecastTile({ index, weather }: { index: number; weather: number }) {
  return (
    <div className='flex flex-col text-gray-8-- items-center justify-center gap-x-[8px]'>
      <h3>{index}</h3>
      <div className='flex items-center justify-center bg-white border-2 border-solid border-sky-500 rounded-[5px] p-[8px]'>
        <img className='w-[50px]' src={weather ? Sun : Rain} />
      </div>
    </div>
  );
}

type levelData = {
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
} | null;
