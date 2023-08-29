import { arrayRemove, arrayUnion, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { firestore } from '../firebase.ts';
import { useNavigate, useParams } from 'react-router-dom';
import { useContext, useEffect, useRef, useState } from 'react';
import LandingBackground from '../assets/landing-background.jpeg';
import { TeamContext } from '../context/TeamContext.tsx';

//TODO - strongly type this.

export default function WaitingRoom() {
  const { teamNumber, setTeamNumber } = useContext(TeamContext);
  const [teams, setTeams] = useState<Number[]>([]);
  const [numberOfTeams, setNumberOfTeams] = useState<number>(0);

  const sessionID: string = useParams()?.sessionID ?? '';
  const selectRef = useRef<HTMLSelectElement>(null);

  const navigate = useNavigate();

  //TODO load data solely in useeffect not in loader.
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(firestore, 'sessions', sessionID), (doc) => {
      const data = doc.data();
      setNumberOfTeams(data?.numberOfTeams);
      const teams = data?.teams;
      if (teams === undefined) {
        // setWaitingUsers([]);
        setTeams([]);
      } else {
        setTeams(teams);
      }

      if (data?.gameStarted) {
        navigate(`/level/${sessionID}/1`);
      }
    });
    return () => unsubscribe();
  }, []);

  //TODO - validate against existing usernames.
  //TODO - validate against empty string etc.

  async function handleAddTeam(teamNumber: number) {
    if (teamNumber == 0) return;
    //TODO - validate against existing usernames.
    const docRef = doc(firestore, 'sessions', sessionID);
    await updateDoc(docRef, { teams: arrayUnion(teamNumber) }).then(() => {
      setTeamNumber(teamNumber);
      sessionStorage.setItem('teamNumber', String(teamNumber));
    });
  }

  async function handleRemoveTeam(teamNumber: number) {
    const docRef = doc(firestore, 'sessions', sessionID);
    await updateDoc(docRef, { teams: arrayRemove(teamNumber) }).then(() => {
      setTeamNumber(0);
      sessionStorage.setItem('teamNumber', String(0));
    });
  }

  //TODO - add loading state.
  console.log('teamNumber: ', teamNumber);
  return (
    <div className='background-image' style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundImage: `url(${LandingBackground})` }}>
      <div className='waiting-room-container'>
        <h1 className='title'>
          FESTIVAL <br /> FRENZY
        </h1>
        <h2>Waiting for host to start the game...</h2>
        <div className='team-tiles'>
          {teamNumber == 0 ? (
            <div className='relative h-[50px] bg-white rounded-[12px] w-fit px-[12px] text-center team-tile-container' style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <select
                ref={selectRef}
                onChange={() => {
                  handleAddTeam(Number(selectRef.current?.value));
                }}
                className={`text-center ${teamNumber == 0 && 'text-gray-400'} ${teamNumber != 0 && 'font-bold'} px-2 text-base w-[200px] h-full border-none outline-none`}
              >
                <option className='text-red-400' value={0}>
                  Select team number
                </option>
                {Array(numberOfTeams)
                  .fill({})
                  .map((_, i) => (
                    <option disabled={teams.includes(i + 1)} key={i + 1} value={i + 1}>
                      Team {i + 1}
                    </option>
                  ))}
              </select>
            </div>
          ) : (
            <div className='flex flex-col items-center justify-center'>
              <TeamTile teamName={'Team ' + teamNumber} />
              <button
                onClick={() => {
                  handleRemoveTeam(teamNumber);
                }}
                className={`cursor-pointer hover:text-blue-800 text-blue-600 bg-transparent outline-none border-none`}
              >
                <p className='text-base underline'>Change team number</p>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TeamTile({ teamName }: { teamName: string }) {
  return (
    <div className='flex items-center justify-center h-[20px] bg-white rounded-[12px] w-[200px] py-[12px] team-tile-container'>
      <h3>{teamName}</h3>
    </div>
  );
}
