import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { firestore } from '../firebase.ts';
import firebase from 'firebase/compat/app';
import { useNavigate } from 'react-router-dom';

export function Test() {
  return <MyComponent numberProp={69} />;
}

function MyComponent({ numberProp }: { numberProp: number }) {
  function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function first() {
    await sleep(2000);
    console.log('first');
  }

  // first();
  return <h1>test</h1>;
}
