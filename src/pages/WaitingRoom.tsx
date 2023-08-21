import { arrayUnion, doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { firestore } from '../firebase.ts';
import { useLoaderData, useNavigate, useParams } from 'react-router-dom';
import { useContext, useEffect, useState } from 'react';
import LandingBackground from '../assets/landing-background.jpeg';
import JoinIcon from '../assets/join.png';
import { UsernameContext } from '../context/UsernameContext.tsx';

//TODO - strongly type this.
export async function loader({ params }: any): Promise<string[]> {
  const sessionID = params.sessionID;
  const docRef = doc(firestore, 'sessions', sessionID);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    const users = data.users;
    if (users === undefined) {
      return [];
    }
    return users;
  } else {
    console.log('error');
    return [];
  }
}

export default function WaitingRoom() {
  const [users, setUsers] = useState(useLoaderData() as string[]);
  const sessionID: string = useParams()?.sessionID ?? '';
  const { username, setUsername } = useContext(UsernameContext);
  const [tempUsername, setTempUsername] = useState('');
  // const [userInGame, setUserInGame] = useState(false);
  const userInGame = username != '';
  const navigate = useNavigate();

  //TODO load data solely in useeffect not in loader.
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(firestore, 'sessions', sessionID), (doc) => {
      const data = doc.data();
      const users = data?.users;
      if (users === undefined) {
        // setWaitingUsers([]);
        setUsers([]);
      } else {
        setUsers(users);
      }

      if (data?.gameStarted) {
        navigate(`/level/${sessionID}/1`);
      }
    });
    return () => unsubscribe();
  }, []);

  //TODO - validate against existing usernames.
  //TODO - validate against empty string etc.
  async function handleAddPlayer(username: string) {
    const docRef = doc(firestore, 'sessions', sessionID);
    // setUserInGame(true);
    await updateDoc(docRef, { users: arrayUnion(username) });
    setUsername(username);
    sessionStorage.setItem('username', username);
  }

  //TODO - add loading state.
  console.log('sessionStorage.username: ', sessionStorage.getItem('username'));
  console.log('username: ', username);
  return (
    <div className='background-image' style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundImage: `url(${LandingBackground})` }}>
      <div className='waiting-room-container'>
        <h1 className='title'>
          FESTIVAL <br /> FRENZY
        </h1>
        <h2>Waiting for host to start the game...</h2>
        <div className='team-tiles'>
          {!userInGame ? (
            <div className='team-tile-container' style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <input className='username-input' placeholder='Type your name...' type='text' onChange={(e) => setTempUsername(e.target.value)} />
              <button style={{ backgroundColor: 'transparent', border: 'none', outline: ' none', padding: '0', cursor: 'pointer' }} onClick={() => handleAddPlayer(tempUsername)}>
                <img src={JoinIcon} width='30px' />
              </button>
            </div>
          ) : (
            users.map((user) => <TeamTile teamName={user} key={user} />)
          )}
        </div>
      </div>
    </div>
  );
}

function TeamTile({ teamName }: { teamName: string }) {
  return (
    <div className='team-tile-container'>
      <h3>{teamName}</h3>
    </div>
  );
}
