import type { PersonData } from './dataStore'
import type { UserAccount } from './userStore'

function digits(value: string | undefined | null): string {
  return (value ?? '').replace(/\D/g, '')
}

function phoneList(person: Pick<PersonData, 'phone' | 'phones'>): string[] {
  const list = [
    person.phone,
    ...(Array.isArray(person.phones) ? person.phones : []),
  ]
  return list.map(digits).filter(d => d.length >= 11)
}

/** 注册账号与人物档案是否为同一人：先比真实姓名，再用登录手机号对电话。 */
export function personMatchesUser(
  person: Pick<PersonData, 'name' | 'phone' | 'phones'>,
  user: Pick<UserAccount, 'personName' | 'username'> | null
): boolean {
  if (!user) return false
  const name = user.personName?.trim()
  if (name && person.name.trim() === name) return true
  const loginDigits = digits(user.username)
  if (loginDigits.length === 11 && phoneList(person).includes(loginDigits)) return true
  return false
}

export function findPersonForUser<T extends Pick<PersonData, 'name' | 'phone' | 'phones'>>(
  people: T[],
  user: Pick<UserAccount, 'personName' | 'username'> | null
): T | null {
  if (!user) return null
  return people.find(p => personMatchesUser(p, user)) ?? null
}
