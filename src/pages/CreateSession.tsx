import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { firestore } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { useRef } from 'react';

export default function CreateSession() {
  const navigate = useNavigate();
  const numberOfTeamsRef = useRef<HTMLInputElement>(null);

  async function handleCreateSession() {
    const code = await getValidCode();
    const colRef = collection(firestore, 'sessions');
    const docRef = await addDoc(colRef, {
      code: code,
      currentLevel: 0,
      teams: [],
      allowNewTeams: true,
      dieValues: {},
      gameStarted: false,
      numberOfTeams: Number(numberOfTeamsRef.current?.value),
    });
    navigate(`/host/${docRef.id}`);
  }

  return (
    <div style={{ display: 'flex flex-col', columnGap: '18px' }}>
      <div className='flex m-[24px] items-center gap-x-4'>
        <p>Number of teams</p>
        <input className='h-[30px]' ref={numberOfTeamsRef} type='number' defaultValue={20} />
      </div>

      <button style={{ margin: '24px' }} onClick={handleCreateSession}>
        <h2>Create Session!</h2>
      </button>
    </div>
  );
}

async function getValidCode() {
  const colRef = collection(firestore, 'sessions');
  const q = query(colRef, where('active', '==', true));
  const querySnapshot = await getDocs(q);
  let activeCodes: string[] = [];
  querySnapshot.forEach((doc) => {
    activeCodes.push(doc.data().code);
  });
  let code = Math.floor(100000 + Math.random() * 900000).toString();
  while (activeCodes.includes(code)) {
    code = Math.floor(100000 + Math.random() * 900000).toString();
  }
  return code;
}
