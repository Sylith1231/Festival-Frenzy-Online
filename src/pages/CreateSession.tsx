import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { firestore } from '../firebase';
import { useNavigate } from 'react-router-dom';

export default function CreateSession() {
  const navigate = useNavigate();

  async function handleCreateSession() {
    const code = await getValidCode();
    const colRef = collection(firestore, 'sessions');
    const docRef = await addDoc(colRef, {
      code: code,
      currentLevel: 0,
      users: [],
      allowNewUsers: true,
      dieValues: {},
      gameStarted: false,
    });
    navigate(`/host/${docRef.id}`);
  }

  return (
    <div style={{ display: 'flex', columnGap: '18px' }}>
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
