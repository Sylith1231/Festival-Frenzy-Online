//TODO add orderSubmitted info to context so button doesn't render as not submitted on refresh.
//TODO I don't think sessionID should come from params (infinite loop).

import IsleOfWight from '../assets/festival-banners/isle-of-wight.jpeg';
import Sun from '../assets/sun.png';
import Rain from '../assets/rain.jpeg';
import Sunglasses from '../assets/sunglasses.png';
import Wellies from '../assets/wellies.png';
import PriceTag from '../assets/price_tag.png';

import Die1 from '../assets/die/die1.png';
import Die2 from '../assets/die/die2.png';
import Die3 from '../assets/die/die3.png';
import Die4 from '../assets/die/die4.png';
import Die5 from '../assets/die/die5.png';
import Die6 from '../assets/die/die6.png';

import festivalData from '../data/FestivalData.json';
import { Dispatch, SetStateAction, useContext, useEffect, useState } from 'react';
import { UsernameContext } from '../context/UsernameContext';
import { firestore } from '../firebase';
import { DocumentReference, arrayRemove, arrayUnion, doc, getDoc, onSnapshot, writeBatch } from 'firebase/firestore';
import { useNavigate, useParams } from 'react-router-dom';

export default function level() {
  //UseContext
  const { username } = useContext(UsernameContext);

  //UseParams
  const sessionID: string = useParams()?.sessionID ?? '';
  const currentLevel: number = (useParams()?.levelID ?? 1) as number;

  //UseState
  const [balance, setBalance] = useState(0);
  const [welliesQty, setWelliesQty] = useState(0);
  const [sunglassesQty, setSunglassesQty] = useState(0);
  // const [currentLevel, setCurrentLevel] = useState(0);
  const [orderSubmitted, setOrderSubmitted] = useState<boolean>(false);
  const [finalDieValues, setFinalDieValues] = useState<number[]>([-1, -1]);
  const levelData = festivalData[Math.floor(currentLevel / 2)];
  const tempBalance = balance - welliesQty * levelData.prices.welliesCost - sunglassesQty * levelData.prices.sunglassesCost;
  const docRef = doc(firestore, 'sessions', sessionID);
  console.log('currentLevel: ', currentLevel);

  const navigate = useNavigate();

  useEffect(() => {
    const docRef = doc(firestore, 'sessions', sessionID);
    const subcollectionUnsubscribe = onSnapshot(doc(docRef, 'players', username), (doc) => {
      const data = doc.data();
      if (data) {
        setBalance(data.balance);
      }
    });
    const unsubscribe = onSnapshot(docRef, (doc) => {
      const data = doc.data();
      if (data?.dieValues) {
        if (data.dieValues.hasOwnProperty(currentLevel)) {
          setFinalDieValues(data.dieValues[currentLevel]);
        }
      }
      if (data?.currentLevel % 2 == 0) navigate(`/leaderboard/${sessionID}`);
    });

    return () => {
      subcollectionUnsubscribe();
      unsubscribe();
    };
  }, [username, sessionID]);

  console.log(levelData.image);
  return (
    // <div className='background-image level-container' style={{ backgroundImage: `url(${IsleOfWight})` }}>
    <div className='background-image level-container' style={{ backgroundImage: `url(${levelData.image})` }}>
      <div style={{ backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '24px', rowGap: '32px' }}>
        <h1 style={{ color: 'white', fontSize: '40px' }}>
          <span style={{ color: 'gold' }}>{levelData.level}</span> {levelData.name}
        </h1>
        <Forecast weather={levelData.weather} />
        <ItemPrices prices={levelData.prices} />
        <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', columnGap: '16px' }}>
            <h3>Wellies Qty:</h3>
            {orderSubmitted ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40px', width: '150px', textAlign: 'center', fontSize: '18pt' }}>{welliesQty}</div>
            ) : (
              <input className='quantity-input' type='number' defaultValue={welliesQty} min={0} onChange={(e) => setWelliesQty(Number(e.target.value))} />
            )}
          </div>

          <h2 style={{ width: '300px' }}>
            Remaining balance: <span style={{ color: tempBalance > 0 ? 'green' : tempBalance < 0 ? 'red' : 'black' }}>£{orderSubmitted ? balance : tempBalance}</span>
          </h2>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', columnGap: '16px' }}>
            <h3>Sunglasses Qty:</h3>
            {orderSubmitted ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40px', width: '150px', textAlign: 'center', fontSize: '18pt' }}>{sunglassesQty}</div>
            ) : (
              <input className='quantity-input' type='number' defaultValue={sunglassesQty} min={0} onChange={(e) => setSunglassesQty(Number(e.target.value))} />
            )}
          </div>
        </div>
        <OrderButton docRef={docRef} levelID={currentLevel} username={username} startBalance={balance} endBalance={tempBalance} welliesQty={welliesQty} sunglassesQty={sunglassesQty} orderSubmitted={orderSubmitted} setOrderSubmitted={setOrderSubmitted} />
      </div>
      {!finalDieValues.includes(-1) ? <DiceModal finalDieValues={finalDieValues} /> : null}
    </div>
  );
}

function Forecast({ weather }: { weather: number[] }) {
  const forecast_tiles = [];
  for (let i = 0; i < 11; i++) {
    forecast_tiles.push(<ForecastTile index={i + 2} weather={weather[i]} key={`${i}`} />);
  }

  return <div className='forecast'>{forecast_tiles}</div>;
}

function ForecastTile({ index, weather }: { index: number; weather: number }) {
  return (
    <div className='forecast-tile'>
      <h3>{index}</h3>
      <div className='weather-img'>
        <img src={weather ? Sun : Rain} />
      </div>
    </div>
  );
}

interface ItemPricesType {
  welliesCost: number;
  sunglassesCost: number;
  sellWelliesBW: number;
  sellWelliesGW: number;
  sellSunglassesGW: number;
  sellSunglassesBW: number;
}

function ItemPrices({ prices }: { prices: ItemPricesType }) {
  return (
    <div className='products'>
      <div className='wellies'>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img src={Wellies} />
          <div className='price_tag'>
            <img src={PriceTag} />
            <h1>£{prices.welliesCost}</h1>
          </div>
          <div className='sell-prices'>
            <h1 className='sell_prices_text'>SELL PRICES</h1>
            <div className='sell_prices'>
              <div className='weather_price'>
                <img src={Rain} />
                <h1 style={{ paddingBottom: '10px' }}>£{prices.sellWelliesBW}</h1>
              </div>
              <div className='weather_price'>
                <img src={Sun} />
                <h1>£{prices.sellWelliesGW}</h1>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div style={{ borderLeft: '3px solid black', height: '200px', margin: '0px 50px' }}></div>
      <div className='sunglasses'>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img src={Sunglasses} />
          <div className='price_tag'>
            <img src={PriceTag} />
            <h1>£{prices.sunglassesCost}</h1>
          </div>
          <div className='sell-prices'>
            <h1 className='sell_prices_text'>SELL PRICES</h1>
            <div className='sell_prices'>
              <div className='weather_price'>
                <img src={Rain} />
                <h1 style={{ paddingBottom: '10px' }}>£{prices.sellSunglassesBW}</h1>
              </div>
              <div className='weather_price'>
                <img src={Sun} />
                <h1>£{prices.sellSunglassesGW}</h1>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface OrderButtonProps {
  docRef: DocumentReference;
  levelID: number;
  username: string;
  startBalance: number;
  endBalance: number;
  welliesQty: number;
  sunglassesQty: number;
  orderSubmitted: boolean;
  setOrderSubmitted: Dispatch<SetStateAction<boolean>>;
}

function OrderButton({ docRef, levelID, username, startBalance, endBalance, welliesQty, sunglassesQty, orderSubmitted, setOrderSubmitted }: OrderButtonProps) {
  async function handleSubmitOrder(docRef: DocumentReference, levelID: number, username: string, startBalance: number, endBalance: number, welliesQty: number, sunglassesQty: number) {
    const batch = writeBatch(firestore);

    batch.update(doc(docRef, 'players', username), {
      balance: endBalance,
      [`orders.${levelID}`]: {
        orderSubmitted: true,
        startBalance: startBalance,
        welliesQty: welliesQty,
        sunglassesQty: sunglassesQty,
        endBalance: endBalance,
      },
    });

    batch.update(docRef, {
      orderSubmitted: arrayUnion(username),
    });

    setOrderSubmitted(true);

    await batch.commit();
  }

  async function handleCancelOrder(docRef: DocumentReference, levelID: number, username: string) {
    const originalBalance = await getDoc(doc(docRef, 'players', username)).then((doc) => doc.data()?.orders[levelID].startBalance);

    const batch = writeBatch(firestore);
    batch.update(doc(docRef, 'players', username), {
      balance: originalBalance,
      [`orders.${levelID}`]: {
        orderSubmitted: false,
        startBalance: originalBalance,
      },
    });

    batch.update(docRef, {
      orderSubmitted: arrayRemove(username),
    });

    await batch.commit();

    setOrderSubmitted(false);
  }

  return !orderSubmitted ? (
    <button className='submit-order-button' onClick={() => handleSubmitOrder(docRef, levelID, username, startBalance, endBalance, welliesQty, sunglassesQty)}>
      <h2>Submit Order!</h2>
    </button>
  ) : (
    <button className='cancel-order-button' onClick={() => handleCancelOrder(docRef, levelID, username)}>
      <h2>Cancel order!</h2>
    </button>
  );
}

function DiceModal({ finalDieValues }: { finalDieValues: number[] }) {
  const [dies, setDies] = useState([5, 5]);
  const intervals = [208.0, 232.00000000000003, 272.0, 328.0, 400.0, 488.00000000000006, 592.0000000000001, 712.0000000000001, 848.0, 1000.0, 1168.0000000000002, 1352.0000000000002, 1552.0000000000002, 1768.0000000000002, 2000.0];
  const die_images = [Die1, Die2, Die3, Die4, Die5, Die6];

  function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  useEffect(() => {
    const leftDieNumbers = Array.from({ length: 29 }, () => Math.floor(Math.random() * 6));
    const rightDieNumbers = Array.from({ length: 29 }, () => Math.floor(Math.random() * 6));
    leftDieNumbers.push(finalDieValues[0]);
    rightDieNumbers.push(finalDieValues[1]);

    (async () => {
      for (let i = 0; i < 30; i++) {
        setDies([leftDieNumbers[i], rightDieNumbers[i]]);
        i < 20 ? await sleep(200) : await sleep(intervals[i - 20]);
      }
    })();
  }, []);

  return (
    <div className='modal'>
      <div className='die_container'>
        <img
          src={die_images[dies[0]]}
          className='dice'
          draggable='false'
          onContextMenu={(event) => {
            event.preventDefault();
          }}
        />
        <img
          src={die_images[dies[1]]}
          className='dice'
          draggable='false'
          onContextMenu={(event) => {
            event.preventDefault();
          }}
        />
      </div>
    </div>
  );
}
