import { EncodeObject } from '@cosmjs/proto-signing'
import { IGasHashMap, IGasRate } from '@/interfaces'

const hashMap: IGasHashMap = {
  /** Filetree */
  '/canine_chain.filetree.MsgPostFile': 70,
  '/canine_chain.filetree.MsgAddViewers': 142,
  '/canine_chain.filetree.MsgPostkey': 12,
  '/canine_chain.filetree.MsgDeleteFile': 9,
  '/canine_chain.filetree.MsgRemoveViewers': 142,
  '/canine_chain.filetree.MsgMakeRoot': 46,
  '/canine_chain.filetree.MsgAddEditors': 142,
  '/canine_chain.filetree.MsgRemoveEditors': 142,
  '/canine_chain.filetree.MsgResetEditors': 142,
  '/canine_chain.filetree.MsgResetViewers': 142,
  '/canine_chain.filetree.MsgChangeOwner': 142,
  /** Oracle */
  '/canine_chain.oracle.MsgCreateFeed': 142,
  '/canine_chain.oracle.MsgUpdateFeed': 142,
  /** RNS */
  '/canine_chain.rns.MsgAcceptBid': 142,
  '/canine_chain.rns.MsgAddRecord': 142,
  '/canine_chain.rns.MsgBid': 23,
  '/canine_chain.rns.MsgBuy': 35,
  '/canine_chain.rns.MsgCancelBid': 142,
  '/canine_chain.rns.MsgDelist': 142,
  '/canine_chain.rns.MsgDelRecord': 142,
  '/canine_chain.rns.MsgInit': 15,
  '/canine_chain.rns.MsgList': 14,
  '/canine_chain.rns.MsgRegister': 37,
  '/canine_chain.rns.MsgTransfer': 142,
  '/canine_chain.rns.MsgUpdate': 142,
  /** Storage */
  '/canine_chain.storage.MsgPostContract': 126,
  '/canine_chain.storage.MsgPostproof': 142,
  '/canine_chain.storage.MsgSignContract': 82,
  '/canine_chain.storage.MsgSetProviderIP': 142,
  '/canine_chain.storage.MsgSetProviderKeybase': 142,
  '/canine_chain.storage.MsgSetProviderTotalspace': 142,
  '/canine_chain.storage.MsgInitProvider': 142,
  '/canine_chain.storage.MsgCancelContract': 29,
  '/canine_chain.storage.MsgBuyStorage': 142,
  '/canine_chain.storage.MsgClaimStray': 142,
  '/canine_chain.storage.MsgUpgradeStorage': 142,
  /** Bank */
  '/cosmos.bank.v1beta1.MsgMultiSend': 142,
  '/cosmos.bank.v1beta1.MsgSend': 142,
  /** Distribution */
  '/cosmos.distribution.v1beta1.MsgFundCommunityPool': 142,
  '/cosmos.distribution.v1beta1.MsgSetWithdrawAddress': 142,
  '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward': 142,
  '/cosmos.distribution.v1beta1.MsgWithdrawValidatorCommission': 142,
  /** Gov */
  '/cosmos.gov.v1beta1.MsgDeposit': 142,
  '/cosmos.gov.v1beta1.MsgSubmitProposal': 142,
  '/cosmos.gov.v1beta1.MsgVote': 142,
  '/cosmos.gov.v1beta1.MsgVoteWeighted': 142,
  /** Staking */
  '/cosmos.staking.v1beta1.MsgBeginRedelegate': 142,
  '/cosmos.staking.v1beta1.MsgCreateValidator': 142,
  '/cosmos.staking.v1beta1.MsgDelegate': 142,
  '/cosmos.staking.v1beta1.MsgEditValidator': 142,
  '/cosmos.staking.v1beta1.MsgUndelegate': 142
}
const baseRate = 56

export function estimateGas (msgArray: EncodeObject[]): number {
  const gas = msgArray.reduce((acc, curr) => {
    return acc + (hashMap[curr.typeUrl] || 0)
  }, 0)
  return (gas + baseRate) * 1100
}
/** @private */
export function finalizeGas (msgArray: EncodeObject[]): IGasRate {
  const totalGas = estimateGas(msgArray)
  return {
    amount: [],
    // gas: '2000000'
    gas: totalGas.toString()
  }
}
