import { AccountData, EncodeObject, isOfflineDirectSigner, OfflineSigner } from '@cosmjs/proto-signing'
import { encrypt, decrypt, PrivateKey } from 'eciesjs'
import { Window as KeplrWindow } from '@keplr-wallet/types'
import { defaultQueryAddr9091, defaultTxAddr26657, jackalMainnetChainId } from '@/utils/globals'
import { IProtoHandler, IWalletHandler } from '@/interfaces/classes'
import { bufferToHex, hashAndHex, hexFullPath, merkleMeBro } from '@/utils/hash'
import { ICoin, IWalletConfig } from '@/interfaces'
import ProtoHandler from '@/classes/protoHandler'

declare global {
  interface Window extends KeplrWindow {}
}

const defaultChains = [jackalMainnetChainId, 'osmo-1', 'cosmoshub-4']

export default class WalletHandler implements IWalletHandler {
  private readonly signer: OfflineSigner
  private readonly keyPair: PrivateKey
  private rnsInitComplete: boolean
  private fileTreeInitComplete: boolean
  private readonly jackalAccount: AccountData
  private readonly pH: IProtoHandler
  readonly isDirect: boolean

  private constructor (signer: OfflineSigner, keyPair: PrivateKey, rnsInitComplete: boolean, fileTreeInitComplete: boolean, acct: AccountData, pH: IProtoHandler) {
    this.signer = signer
    this.keyPair = keyPair
    this.rnsInitComplete = rnsInitComplete
    this.fileTreeInitComplete = fileTreeInitComplete
    this.jackalAccount = acct
    this.pH = pH
    this.isDirect = isOfflineDirectSigner(signer)
  }

  static async trackWallet (config: IWalletConfig): Promise<IWalletHandler> {
    if (!window) {
      throw new Error('Jackal.js is only supported in the browser at this time!')
    } else if (!window.keplr) {
      throw new Error('Jackal.js requires Keplr to be installed!')
    } else {
      const { signerChain, enabledChains, queryAddr, txAddr } = config

      const qAddr = queryAddr || defaultQueryAddr9091
      const tAddr = txAddr || defaultTxAddr26657

      await window.keplr.enable(enabledChains || defaultChains)
        .catch(err => {
          throw err
        })
      const signer = await window.keplr.getOfflineSignerAuto(signerChain || jackalMainnetChainId)
      const acct = (await signer.getAccounts())[0]

      const pH = await ProtoHandler.trackProto(signer, tAddr, qAddr)

      const rnsInitComplete = (await pH.rnsQuery.queryInit({ address: acct.address })).value.init
      const { value: { pubkey }, success} = (await pH.fileTreeQuery.queryPubkey({ address: acct.address }))
      const secret = await makeSecret(signerChain || jackalMainnetChainId, acct.address)
        .catch(err => {
          throw err
        })
      const secretAsHex = bufferToHex(Buffer.from(secret, 'base64').subarray(0, 32))
      const keyPair = PrivateKey.fromHex(secretAsHex)

      return new WalletHandler(signer, keyPair, rnsInitComplete, (success && !!pubkey?.key), acct, pH)
    }
  }
  static async getAbitraryMerkle (path: string, item: string): Promise<string> {
    return await hexFullPath(await merkleMeBro(path), item)
  }
  static async initAccount (wallet: IWalletHandler, filetreeTxClient: any): Promise<EncodeObject> {
    const { msgInitAll } = await filetreeTxClient
    const initCall = msgInitAll({
      creator: wallet.getJackalAddress(),
      pubkey: wallet.getPubkey()
    })
    return initCall
  }

  getRnsInitStatus (): boolean {
    return this.rnsInitComplete
  }
  setRnsInitStatus (status: boolean): void {
    this.rnsInitComplete = status
  }
  getStorageInitStatus (): boolean {
    return this.fileTreeInitComplete
  }
  setStorageInitStatus (status: boolean): void {
    this.fileTreeInitComplete = status
  }
  getProtoHandler (): IProtoHandler {
    return this.pH
  }
  getAccounts (): Promise<readonly AccountData[]> {
    return this.signer.getAccounts()
  }
  getSigner (): OfflineSigner {
    return this.signer
  }
  getJackalAddress (): string {
    return this.jackalAccount.address
  }
  async getHexJackalAddress (): Promise<string> {
    return await hashAndHex(this.jackalAccount.address)
  }
  async getAllBalances (): Promise<ICoin[]> {
    const res = await this.pH.bankQuery.queryAllBalances({ address: this.jackalAccount.address })
    return res.value.balances as ICoin[]
  }
  async getJackalBalance (): Promise<ICoin> {
    const res = await this.pH.bankQuery.queryBalance({ address: this.jackalAccount.address, denom: 'ujkl' })
    return res.value.balance as ICoin
  }
  getPubkey (): string {
    return this.keyPair.publicKey.toHex()
  }
  asymmetricEncrypt (toEncrypt: ArrayBuffer, pubKey: string): string {
    return encrypt(pubKey, Buffer.from(toEncrypt)).toString('hex')
  }
  asymmetricDecrypt (toDecrypt: string): ArrayBuffer {
    return new Uint8Array(decrypt(this.keyPair.toHex(), Buffer.from(toDecrypt, 'hex')))
  }
}

async function makeSecret (chainId: string, acct: string): Promise<string> {
  const memo = 'Initiate Jackal Session'
  if (!window.keplr) {
    throw new Error('Jackal.js requires Keplr to be installed!')
  } else {
    const signed = await window.keplr.signArbitrary(chainId, acct, memo)
      .catch(err => {
        throw err
      })
    return signed.signature
  }
}
