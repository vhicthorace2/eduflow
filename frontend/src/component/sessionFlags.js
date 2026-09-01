const NEW_USER_FLAG = 'ef_new_user';

export function markNewUser() {
  sessionStorage.setItem(NEW_USER_FLAG, '1');
}

export function consumeNewUserFlag() {
  const isNew = sessionStorage.getItem(NEW_USER_FLAG) === '1';
  if (isNew) sessionStorage.removeItem(NEW_USER_FLAG);
  return isNew;
}