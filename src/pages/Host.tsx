//TODO
/*
  -Name changes after game started.
  -Dealing with player removal properly on backend.
  -Dealing with players joining after game started.
  -Ensure allow new users switch works properly.
*/

import Sun from '../assets/sun.png';
import Rain from '../assets/rain.jpeg';
import { arrayRemove, arrayUnion, collection, doc, documentId, getDocs, onSnapshot, query, updateDoc, where, writeBatch } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { firestore } from '../firebase';
import { useParams } from 'react-router-dom';
import { MdCasino, MdClose, MdDone, MdEditSquare, MdNavigateNext, MdPersonRemove, MdRocketLaunch } from 'react-icons/md';
import { IconContext } from 'react-icons';
import festivalData from '../data/FestivalData.json';
import Switch from 'react-switch';
import { calculateWeatherProbability } from '../utilities/calculateWeatherProbability';
import { FaDiceOne, FaDiceTwo, FaDiceThree, FaDiceFour, FaDiceFive, FaDiceSix } from 'react-icons/fa';
import Die1 from '../assets/die/die1.png';
import Die2 from '../assets/die/die2.png';
import Die3 from '../assets/die/die3.png';
import Die4 from '../assets/die/die4.png';
import Die5 from '../assets/die/die5.png';
import Die6 from '../assets/die/die6.png';

export default function Host() {
  const [teams, setTeams] = useState<number[] | null>(null);

  //Consider changing to <boolean|null> (think about loading component if any state is null).
  const [allowNewTeams, setAllowNewTeams] = useState<boolean>(true);
  const [currentLevel, setCurrentLevel] = useState<number | null>(null);
  const [ordersSubmitted, setOrdersSubmitted] = useState<number[] | null>(null);
  const [activeButton, setActiveButton] = useState<number>(0);
  const [code, setCode] = useState<string | null>(null);
  const [removeTeam, setRemoveTeam] = useState<number | null>(null);
  const [showInputDiceModal, setShowInputDiceModal] = useState<boolean>(false);
  const [dieRolling, setDiceRolling] = useState<finalDieValues | null>(null);
  const levelData = currentLevel ? (festivalData[currentLevel - 1] as levelData) : null;
  //TODO deal with sessionID not being defined.
  const sessionID = useParams().sessionID ?? '';

  useEffect(() => {
    const docRef = doc(firestore, 'sessions', sessionID);
    //TODO look into whether I shouould be performing all these updates in the same onSnapshot?
    //I.e. should I be using a different listener for each piece of state? StackOverflow.
    const unsubscribe = onSnapshot(docRef, (doc) => {
      const data = doc.data();
      if (data) {
        setTeams(data.teams ?? null);
        setAllowNewTeams(data.allowNewTeams ?? null);
        setCurrentLevel(data.currentLevel ?? null);
        setOrdersSubmitted(data.ordersSubmitted ?? null);
        setCode(data.code ?? null);
        if (activeButton == 0) {
          if (data.gameStarted == false) {
            setActiveButton(1);
          } else {
            if (data.dieValues[data.currentLevel] || data.currentLevel < 0) {
              setActiveButton(3);
            } else {
              setActiveButton(2);
            }
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
    teams?.forEach((team) => {
      batch.set(doc(docRef, 'teams', String(team)), { balance: 100, orders: {} });
    });
    batch.update(docRef, { gameStarted: true, currentLevel: 1, allowNewTeams: false, ordersSubmitted: [] });
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
    const orderNotSubmitted = teams?.filter((team) => !ordersSubmitted?.includes(team)).map((teamNumber) => String(teamNumber));
    if (orderNotSubmitted?.length == 0) return;
    const colRef = collection(firestore, 'sessions', sessionID, 'teams');
    //TODO ask if this is okay and for more info on stack overflow.
    const q = query(colRef, where(documentId(), 'in', orderNotSubmitted));
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

    await updateBalances({ dice: diceRolls, manualInput: false }).catch((error) => {
      console.log('error🤯: ', error);
    });
    setActiveButton(-1);
    setDiceRolling({ dice: diceRolls, manualInput: false });
  }

  async function handleNext() {
    const nextLevel = currentLevel! > 0 ? -currentLevel! : -(currentLevel! - 1);
    const docRef = doc(firestore, 'sessions', sessionID);
    await updateDoc(docRef, { currentLevel: nextLevel, ordersSubmitted: [] });
    setDiceRolling(null);
  }

  async function updateBalances(diceRolls: finalDieValues) {
    const batch = writeBatch(firestore);
    batch.update(doc(firestore, 'sessions', sessionID), {
      [`dieValues.${currentLevel}`]: diceRolls,
    });
    const snapshot = await getDocs(collection(firestore, 'sessions', sessionID, 'teams'));
    const goodWeather = levelData?.weather[diceRolls.dice[0] + diceRolls.dice[1]] == 1;
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
      <div className='flex flex-col items-center justify-center h-full w-full bg-gray-100 gap-y-8'>
        <div className='flex gap-x-4'>
          {/* Players / Leaderboard Section */}
          <div className='bg-white rounded-xl p-4'>
            <p className='m-0 text-2xl text-gray-800 font-bold'>Teams</p>
            <ul className='h-full list-none p-0'>{teams ? teams.sort().map((team) => <TeamEntry key={team} teamNumber={team} sessionID={sessionID} orderSubmitted={currentLevel! <= 0 ? null : ordersSubmitted?.includes(team)} setRemoveTeam={setRemoveTeam} />) : 'TODO ERROR'}</ul>
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
                  <p className='m-0 italic text-md'>{teams?.length ?? 0} teams</p>
                  <div className='mx-2 border border-solid border-transparent border-l-gray-300 h-4' />
                  <p className={`m-0 italic text-md ${currentLevel == 0 ? 'text-red-500' : 'text-[#4CAF50]'}`}>{currentLevel == 0 ? 'waiting room' : 'in progress'}</p>
                </div>
                <div className='mt-2 flex items-center gap-x-2'>
                  <p className='m-0 text-md'>Allow teams to join: </p>
                  <Switch checked={allowNewTeams} onChange={async (checked) => updateDoc(doc(firestore, 'sessions', sessionID), { allowNewTeams: checked })} onColor='#38bdf8' offColor='#ef4444' activeBoxShadow='' height={28 * 0.8} width={56 * 1 * 0.8} handleDiameter={24 * 0.8} />
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
                    <p className={`${activeButton != 3 ? 'text-gray-300' : 'text-[#03A9F4]'} m-0 font-bold text-lg`}>Next</p>
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
                  <button onClick={() => setShowInputDiceModal(true)} disabled={activeButton != 2} className={`flex disabled:border-gray-200 disabled:bg-gray-100 items-center justify-center gap-x-2 border-2 border-solid border-[#EF5350] cursor-pointer disabled:cursor-default bg-white hover:bg-[#FFEBEE] rounded-lg h-full`}>
                    <p className={`${activeButton != 2 && 'text-gray-300'} m-0 font-bold text-lg text-[#EF5350]`}>Input Dice</p>
                    <IconContext.Provider value={{ color: `${activeButton != 2 ? '#D1D5DB' : '#EF5350'}`, size: '2em' }}>
                      <MdEditSquare />
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
        {dieRolling ? <DiceModal finalDieValues={dieRolling!} setActiveButton={setActiveButton} /> : <div className='h-[80px] w-[190px]'></div>}
      </div>
      <RemoveTeamModal removeTeam={removeTeam} setRemoveTeam={setRemoveTeam} sessionID={sessionID} />
      {showInputDiceModal && <InputDiceModal autofillOrders={autofillOrders} updateBalances={updateBalances} setActiveButton={setActiveButton} setShowInputDiceModal={setShowInputDiceModal} />}
    </>
  );
}

type TeamEntryProps = {
  teamNumber: number;
  sessionID: string;
  orderSubmitted?: boolean | null;
  setRemoveTeam: React.Dispatch<React.SetStateAction<number | null>>;
};

function TeamEntry({ teamNumber, sessionID, orderSubmitted, setRemoveTeam }: TeamEntryProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleOnKeyUp(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      if (inputRef.current && inputRef.current?.value !== 'Team ' + teamNumber) {
        const docRef = doc(firestore, 'sessions', sessionID);
        const newUsername = inputRef.current.value;
        const batch = writeBatch(firestore);
        batch.update(docRef, { teams: arrayUnion(newUsername) });
        batch.update(docRef, { teams: arrayRemove(teamNumber) });
        await batch.commit();
      }
    }
  }
  async function handleOnKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Tab') {
      if (inputRef.current && inputRef.current?.value !== 'Team ' + teamNumber) {
        const docRef = doc(firestore, 'sessions', sessionID);
        const newUsername = inputRef.current.value;
        const batch = writeBatch(firestore);
        batch.update(docRef, { teams: arrayUnion(newUsername) });
        batch.update(docRef, { teams: arrayRemove(teamNumber) });
        await batch.commit();
      }
    }
  }

  function handleOnBlur() {
    if (inputRef.current && inputRef.current?.value !== 'Team ' + teamNumber) {
      inputRef.current.value = 'Team ' + teamNumber;
    }
  }

  return (
    <li className='flex items-center justify-center gap-x-2 mb-1'>
      {/* Disable input when game started */}
      <input disabled={true} ref={inputRef} onKeyDown={handleOnKeyDown} onKeyUp={handleOnKeyUp} onBlur={handleOnBlur} defaultValue={'Team ' + teamNumber} type='text' className={`text-center rounded border-2 border-solid ${orderSubmitted === null && 'border-gray-300'} ${orderSubmitted !== null && (orderSubmitted ? 'border-[#4CAF50]' : 'border-red-500')} px-6 py-0.5 w-20 text-base m-0`} />
      <button onClick={() => setRemoveTeam(teamNumber)} className='outline-none inline-block bg-transparent border-none p-0 cursor-pointer'>
        <IconContext.Provider value={{ color: '#F5F5F5', size: '1.8em', className: 'remove-player-icon' }}>
          <MdPersonRemove />
        </IconContext.Provider>
      </button>
    </li>
  );
}

type InputDiceModalProps = {
  autofillOrders: () => Promise<void>;
  updateBalances: (diceRolls: finalDieValues) => Promise<void>;
  setActiveButton: React.Dispatch<React.SetStateAction<number>>;
  setShowInputDiceModal: React.Dispatch<React.SetStateAction<boolean>>;
};

function InputDiceModal({ autofillOrders, updateBalances, setActiveButton, setShowInputDiceModal }: InputDiceModalProps) {
  const [die1, setDie1] = useState<number | null>(null);
  const [die2, setDie2] = useState<number | null>(null);

  async function handleSubmitDice() {
    const diceRolls = { dice: [die1! - 1, die2! - 1], manualInput: true };
    await autofillOrders();
    await updateBalances(diceRolls)
      .then(() => {
        setActiveButton(3);
      })
      .then(() => {
        setShowInputDiceModal(false);
      })
      .catch((error) => {
        console.log('error🤯: ', error);
      });
  }

  return (
    <div className='flex items-center justify-center fixed inset-0 bg-black bg-opacity-80'>
      <div className='bg-white rounded-lg p-4 flex flex-col justify-center items-center'>
        <div className='flex mb-4'>
          {/* First Die Selector */}
          <div className='flex flex-col items-center justify-center'>
            <p className='m-0 mb-4 text-xl'>Die 1</p>
            <div className='flex'>
              {/* Die 1 Column 1 */}
              <div className='flex flex-col'>
                <button onClick={() => setDie1(1)} className='bg-transparent border-none'>
                  <IconContext.Provider value={{ color: die1 == 1 ? '#ef5350' : '#E0E0E0', size: die1 == 1 ? '4.5em' : '4em', className: die1 == 1 ? '' : 'dice-icon' }}>
                    <FaDiceOne />
                  </IconContext.Provider>
                </button>
                <button onClick={() => setDie1(3)} className='bg-transparent border-none'>
                  <IconContext.Provider value={{ color: die1 == 3 ? '#ef5350' : '#E0E0E0', size: die1 == 3 ? '4.5em' : '4em', className: die1 == 3 ? '' : 'dice-icon' }}>
                    <FaDiceThree />
                  </IconContext.Provider>
                </button>
                <button onClick={() => setDie1(5)} className='bg-transparent border-none'>
                  <IconContext.Provider value={{ color: die1 == 5 ? '#ef5350' : '#E0E0E0', size: die1 == 5 ? '4.5em' : '4em', className: die1 == 5 ? '' : 'dice-icon' }}>
                    <FaDiceFive />
                  </IconContext.Provider>
                </button>
              </div>

              {/* Die 1 Column 2 */}
              <div className='flex flex-col items-center justify-center'>
                <button onClick={() => setDie1(2)} className='bg-transparent border-none'>
                  <IconContext.Provider value={{ color: die1 == 2 ? '#ef5350' : '#E0E0E0', size: die1 == 2 ? '4.5em' : '4em', className: die1 == 2 ? '' : 'dice-icon' }}>
                    <FaDiceTwo />
                  </IconContext.Provider>
                </button>
                <button onClick={() => setDie1(4)} className='bg-transparent border-none'>
                  <IconContext.Provider value={{ color: die1 == 4 ? '#ef5350' : '#E0E0E0', size: die1 == 4 ? '4.5em' : '4em', className: die1 == 4 ? '' : 'dice-icon' }}>
                    <FaDiceFour />
                  </IconContext.Provider>
                </button>
                <button onClick={() => setDie1(6)} className='bg-transparent border-none'>
                  <IconContext.Provider value={{ color: die1 == 6 ? '#ef5350' : '#E0E0E0', size: die1 == 6 ? '4.5em' : '4em', className: die1 == 6 ? '' : 'dice-icon' }}>
                    <FaDiceSix />
                  </IconContext.Provider>
                </button>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className='mx-4 border-[0.5px] border-solid border-gray-300'></div>

          {/* Second Die Selector */}
          <div className='flex flex-col items-center justify-center'>
            <p className='m-0 text-xl mb-4'>Die 2</p>

            <div className='flex'>
              {/* Die 2 Column 1 */}
              <div className='flex flex-col'>
                <button onClick={() => setDie2(1)} className='bg-transparent border-none'>
                  <IconContext.Provider value={{ color: die2 == 1 ? '#ef5350' : '#E0E0E0', size: die2 == 1 ? '4.5em' : '4em', className: die2 == 1 ? '' : 'dice-icon' }}>
                    <FaDiceOne />
                  </IconContext.Provider>
                </button>
                <button onClick={() => setDie2(3)} className='bg-transparent border-none'>
                  <IconContext.Provider value={{ color: die2 == 3 ? '#ef5350' : '#E0E0E0', size: die2 == 3 ? '4.5em' : '4em', className: die2 == 3 ? '' : 'dice-icon' }}>
                    <FaDiceThree />
                  </IconContext.Provider>
                </button>
                <button onClick={() => setDie2(5)} className='bg-transparent border-none'>
                  <IconContext.Provider value={{ color: die2 == 5 ? '#ef5350' : '#E0E0E0', size: die2 == 5 ? '4.5em' : '4em', className: die2 == 5 ? '' : 'dice-icon' }}>
                    <FaDiceFive />
                  </IconContext.Provider>
                </button>
              </div>

              {/* Die 2 Column 2 */}
              <div className='flex flex-col'>
                <button onClick={() => setDie2(2)} className='bg-transparent border-none'>
                  <IconContext.Provider value={{ color: die2 == 2 ? '#ef5350' : '#E0E0E0', size: die2 == 2 ? '4.5em' : '4em', className: die2 == 2 ? '' : 'dice-icon' }}>
                    <FaDiceTwo />
                  </IconContext.Provider>
                </button>
                <button onClick={() => setDie2(4)} className='bg-transparent border-none'>
                  <IconContext.Provider value={{ color: die2 == 4 ? '#ef5350' : '#E0E0E0', size: die2 == 4 ? '4.5em' : '4em', className: die2 == 4 ? '' : 'dice-icon' }}>
                    <FaDiceFour />
                  </IconContext.Provider>
                </button>
                <button onClick={() => setDie2(6)} className='bg-transparent border-none'>
                  <IconContext.Provider value={{ color: die2 == 6 ? '#ef5350' : '#E0E0E0', size: die2 == 6 ? '4.5em' : '4em', className: die2 == 6 ? '' : 'dice-icon' }}>
                    <FaDiceSix />
                  </IconContext.Provider>
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className='flex flex-col w-full justify-around gap-y-2'>
          <button onClick={() => setShowInputDiceModal(false)} className='bg-white hover:bg-[#FFEBEE] border-2 border-solid border-gray-300 hover:border-[#EF5350] cursor-pointer rounded-md py-2 w-full text-base'>
            Cancel
          </button>
          <button onClick={handleSubmitDice} className={`${die1 && die2 ? 'bg-white' : 'bg-gray-50'} ${die1 && die2 && 'hover:bg-[#E8F5E9]'} border-2 border-solid border-gray-300 ${die1 && die2 ? 'hover:border-[#66BB6A] cursor-pointer' : 'text-gray-200'} rounded-md py-2 w-full text-base`}>
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

type RemoveTeamModalProps = {
  removeTeam: number | null;
  sessionID: string;
  setRemoveTeam: React.Dispatch<React.SetStateAction<number | null>>;
};

function RemoveTeamModal({ removeTeam, sessionID, setRemoveTeam }: RemoveTeamModalProps) {
  if (removeTeam == null) return null;

  async function handleRemoveTeam(teamNumber: number) {
    const docRef = doc(firestore, 'sessions', sessionID);
    await updateDoc(docRef, {
      teams: arrayRemove(teamNumber),
    });
    setRemoveTeam(null);
  }

  return (
    <div className='z-50 fixed flex items-center justify-center inset-0 bg-black bg-opacity-80'>
      <div className='flex flex-col items-center gap-y-4 bg-white rounded-lg p-4'>
        <p className='text-lg m-0'>
          Remove <span className='underline font-bold'>{'Team ' + removeTeam}</span> from the session?
        </p>
        <div className='flex gap-x-2'>
          <button onClick={() => setRemoveTeam(null)} className='cursor-pointer w-[150px] bg-[#FFEBEE] border-2 border-solid border-gray-200 hover:border-[#EF5350] rounded'>
            <IconContext.Provider value={{ color: '#EF5350', size: '2.5em' }}>
              <MdClose />
            </IconContext.Provider>
          </button>
          <button onClick={() => handleRemoveTeam(removeTeam)} className='cursor-pointer w-[150px] bg-[#E8F5E9] border-2 border-solid border-gray-200 hover:border-[#4CAF50] rounded'>
            <IconContext.Provider value={{ color: '#4CAF50', size: '2.5em' }}>
              <MdDone />
            </IconContext.Provider>
          </button>
        </div>
      </div>
    </div>
  );
}

function DiceModal({ finalDieValues, setActiveButton }: { finalDieValues: finalDieValues; setActiveButton: React.Dispatch<React.SetStateAction<number>> }) {
  const [dies, setDies] = useState([5, 5]);
  const intervals = [208.0, 232.00000000000003, 272.0, 328.0, 400.0, 488.00000000000006, 592.0000000000001, 712.0000000000001, 848.0, 1000.0, 1168.0000000000002, 1352.0000000000002, 1552.0000000000002, 1768.0000000000002, 2000.0];
  const die_images = [Die1, Die2, Die3, Die4, Die5, Die6];

  function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  useEffect(() => {
    const { dice, manualInput } = finalDieValues;
    if (manualInput) {
      setDies([dice[0], dice[1]]);
    } else {
      const leftDieNumbers = Array.from({ length: 29 }, () => Math.floor(Math.random() * 6));
      const rightDieNumbers = Array.from({ length: 29 }, () => Math.floor(Math.random() * 6));
      leftDieNumbers.push(finalDieValues.dice[0]);
      rightDieNumbers.push(finalDieValues.dice[1]);

      (async () => {
        for (let i = 0; i < 30; i++) {
          setDies([leftDieNumbers[i], rightDieNumbers[i]]);
          i < 20 ? await sleep(200) : await sleep(intervals[i - 20]);
        }
        setActiveButton(3);
      })();
    }
  }, []);

  return (
    <div className='flex items-center justify-center gap-x-[30px]'>
      <img
        src={die_images[dies[0]]}
        className='w-[80px]'
        draggable='false'
        onContextMenu={(event) => {
          event.preventDefault();
        }}
      />
      <img
        src={die_images[dies[1]]}
        className='w-[80px]'
        draggable='false'
        onContextMenu={(event) => {
          event.preventDefault();
        }}
      />
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

type finalDieValues = {
  dice: number[];
  manualInput: boolean | null;
};
