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

import HourglassAnimation from '../assets/hourglass.gif';

import IsleOfWight from '../assets/festival-banners/isle-of-wight.jpeg';
import Glastonbury from '../assets/festival-banners/glastonbury.jpg';
import Lattitude from '../assets/festival-banners/lattitude.jpeg';
import Womad from '../assets/festival-banners/womad.jpeg';
import Sonisphere from '../assets/festival-banners/sonisphere.jpg';
import BigChillFestivalfrom from '../assets/festival-banners/biggchillfestival.jpg';
import BGG from '../assets/festival-banners/bgg.jpg';
import VFestival from '../assets/festival-banners/vfestival.jpg';
import Reading from '../assets/festival-banners/reading.jpg';

import festivalData from '../data/FestivalData.json';
import { Dispatch, SetStateAction, useContext, useEffect, useState } from 'react';
import { TeamContext } from '../context/TeamContext';
import { firestore } from '../firebase';
import { DocumentReference, arrayRemove, arrayUnion, doc, getDoc, onSnapshot, writeBatch } from 'firebase/firestore';
import { useNavigate, useParams } from 'react-router-dom';
import Countdown from 'react-countdown';

export default function level() {
  //UseContext
  const { teamNumber } = useContext(TeamContext);

  //UseParams
  const sessionID: string = useParams()?.sessionID ?? '';
  const currentLevel: number = (useParams()?.levelID ?? 1) as number;

  //UseState
  const [balance, setBalance] = useState(0);
  const [welliesQty, setWelliesQty] = useState(0);
  const [sunglassesQty, setSunglassesQty] = useState(0);
  // const [currentLevel, setCurrentLevel] = useState(0);
  const [orderSubmitted, setOrderSubmitted] = useState<boolean>(false);
  // const [finalDieValues, setFinalDieValues] = useState<number[]>([-1, -1]);
  const [finalDieValues, setFinalDieValues] = useState<finalDieValues>({ dice: [-1, -1], manualInput: null });
  const [countdown, setCountdown] = useState<Date | null>(null);
  const levelData = festivalData[currentLevel - 1];
  const levelImages = [IsleOfWight, Glastonbury, Lattitude, Womad, Sonisphere, BigChillFestivalfrom, BGG, VFestival, Reading];
  const tempBalance = balance - welliesQty * levelData.prices.welliesCost - sunglassesQty * levelData.prices.sunglassesCost;
  const docRef = doc(firestore, 'sessions', sessionID);

  const navigate = useNavigate();

  useEffect(() => {
    const docRef = doc(firestore, 'sessions', sessionID);
    const subcollectionUnsubscribe = onSnapshot(doc(docRef, 'teams', String(teamNumber)), (doc) => {
      const data = doc.data();
      if (data) {
        setBalance(data.balance);
        setWelliesQty(data.orders[currentLevel]?.welliesQty ?? 0);
        setSunglassesQty(data.orders[currentLevel]?.sunglassesQty ?? 0);
        setOrderSubmitted(data.orders[currentLevel]?.orderSubmitted ?? false);
      }
    });
    const unsubscribe = onSnapshot(docRef, (doc) => {
      const data = doc.data();
      if (data?.countdown) {
        setCountdown(data?.countdown.toDate());
      }
      if (data?.dieValues) {
        if (data.dieValues.hasOwnProperty(currentLevel)) {
          setFinalDieValues(data.dieValues[currentLevel]);
        }
      }
      if (data?.currentLevel < 0) navigate(`/leaderboard/${sessionID}`);
    });

    return () => {
      subcollectionUnsubscribe();
      unsubscribe();
    };
  }, [teamNumber, sessionID]);

  const countdownRenderer = ({ seconds }: { seconds: any; completed: any }) => {
    return (
      <div className='flex items-center gap-x-3'>
        <img width={40} height={40 * 1.2} src={HourglassAnimation} />
        <p className='text-xl font-bold'>{seconds}s</p>
      </div>
    );
  };

  return (
    // <div className='background-image level-container' style={{ backgroundImage: `url(${IsleOfWight})` }}>
    <div className='background-image level-container' style={{ backgroundImage: `url(${levelImages[currentLevel - 1]})` }}>
      <div style={{ backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '24px', rowGap: '32px' }}>
        <div className='w-full flex items-center justify-between'>
          <h1 className='flex-grow text-center' style={{ color: 'white', fontSize: '40px' }}>
            <span style={{ color: 'gold' }}>{levelData.level}</span> {levelData.name}
          </h1>
          {/* Timer */}
          {countdown && <Countdown onComplete={() => setCountdown(null)} onTick={() => console.log('tick')} date={countdown} renderer={countdownRenderer} />}
        </div>
        <Forecast weather={levelData.weather} />
        <ItemPrices prices={levelData.prices} />
        <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', columnGap: '16px' }}>
            <h3>Wellies Qty:</h3>
            {orderSubmitted ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40px', width: '150px', textAlign: 'center', fontSize: '18pt' }}>{welliesQty}</div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', columnGap: '16px', color: 'lightslategray' }}>
                <input className='quantity-input' type='number' defaultValue={welliesQty} min={0} onChange={(e) => setWelliesQty(Number(e.target.value))} />
                <h3 style={{ width: '16px' }}>{Math.floor(tempBalance / levelData.prices.welliesCost) >= 0 ? Math.floor(tempBalance / levelData.prices.welliesCost) : 0}</h3>
              </div>
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
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', columnGap: '16px', color: 'lightslategray' }}>
                <input className='quantity-input' type='number' defaultValue={sunglassesQty} min={0} onChange={(e) => setSunglassesQty(Number(e.target.value))} />
                <h3 style={{ width: '16px' }}>{Math.floor(tempBalance / levelData.prices.sunglassesCost) >= 0 ? Math.floor(tempBalance / levelData.prices.sunglassesCost) : 0}</h3>
              </div>
            )}
          </div>
        </div>
        <OrderButton docRef={docRef} levelID={currentLevel} teamNumber={teamNumber} startBalance={balance} endBalance={tempBalance} welliesQty={welliesQty} sunglassesQty={sunglassesQty} orderSubmitted={orderSubmitted} setOrderSubmitted={setOrderSubmitted} />
      </div>
      {!finalDieValues.dice.includes(-1) ? <DiceModal finalDieValues={finalDieValues} /> : null}
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
  teamNumber: number;
  startBalance: number;
  endBalance: number;
  welliesQty: number;
  sunglassesQty: number;
  orderSubmitted: boolean;
  setOrderSubmitted: Dispatch<SetStateAction<boolean>>;
}

function OrderButton({ docRef, levelID, teamNumber, startBalance, endBalance, welliesQty, sunglassesQty, orderSubmitted, setOrderSubmitted }: OrderButtonProps) {
  async function handleSubmitOrder(docRef: DocumentReference, levelID: number, teamNumber: number, startBalance: number, endBalance: number, welliesQty: number, sunglassesQty: number) {
    if (endBalance < 0) return;
    const batch = writeBatch(firestore);

    batch.update(doc(docRef, 'teams', String(teamNumber)), {
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
      ordersSubmitted: arrayUnion(teamNumber),
    });
    setOrderSubmitted(true);

    await batch.commit();
  }

  async function handleCancelOrder(docRef: DocumentReference, levelID: number, teamNumber: number) {
    const originalBalance = await getDoc(doc(docRef, 'teams', String(teamNumber))).then((doc) => doc.data()?.orders[levelID].startBalance);

    const batch = writeBatch(firestore);
    batch.update(doc(docRef, 'teams', String(teamNumber)), {
      balance: originalBalance,
      [`orders.${levelID}`]: {
        orderSubmitted: false,
        startBalance: originalBalance,
      },
    });

    batch.update(docRef, {
      ordersSubmitted: arrayRemove(teamNumber),
    });

    await batch.commit();

    setOrderSubmitted(false);
  }

  return !orderSubmitted ? (
    <button className='submit-order-button' onClick={() => handleSubmitOrder(docRef, levelID, teamNumber, startBalance, endBalance, welliesQty, sunglassesQty)}>
      <h2>Submit Order!</h2>
    </button>
  ) : (
    <button className='cancel-order-button' onClick={() => handleCancelOrder(docRef, levelID, teamNumber)}>
      <h2>Cancel order!</h2>
    </button>
  );
}

function DiceModal({ finalDieValues }: { finalDieValues: finalDieValues }) {
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
      })();
    }
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

type finalDieValues = {
  dice: number[];
  manualInput: boolean | null;
};
