import { IGovHandler, IProtoHandler, IWalletHandler } from '@/interfaces/classes'
import {
  ICoin,
  IDelegationRewards,
  IDelegationSummary,
  IDelegationSummaryMap,
  IStakingValidator,
  IStakingValidatorExtendedMap,
  IStakingValidatorMap,
  IStakingValidatorStakedMap
} from '@/interfaces'
import { TValidatorStatus } from '@/types/TValidatorStatus'
import { EncodeObject } from '@cosmjs/proto-signing'

export default class GovHandler implements IGovHandler {
  private readonly walletRef: IWalletHandler
  private readonly pH: IProtoHandler

  private constructor (wallet: IWalletHandler) {
    this.walletRef = wallet
    this.pH = wallet.getProtoHandler()
  }

  static async trackGov (wallet: IWalletHandler): Promise<IGovHandler> {
    return new GovHandler(wallet)
  }

  async getTotalRewards (): Promise<IDelegationRewards> {
    const ret = await this.pH.distributionQuery.queryDelegationTotalRewards({
      delegatorAddress: this.walletRef.getJackalAddress()
    })
    return ret.value
  }
  async getCondensedTotalRewards (): Promise<number> {
    const ret = await this.pH.distributionQuery.queryDelegationTotalRewards({
      delegatorAddress: this.walletRef.getJackalAddress()
    })
    return ret.value.total.reduce((acc: number, coin: ICoin) => {
      acc += Number(coin.amount)
      return acc
    }, 0)
  }
  async getRewards (validatorAddress: string): Promise<ICoin[]> {
    const ret = await this.pH.distributionQuery.queryDelegationRewards({
      delegatorAddress: this.walletRef.getJackalAddress(),
      validatorAddress
    })
    return ret.value.rewards
  }
  async getCondensedRewards (validatorAddress: string): Promise<number> {
    const ret = await this.pH.distributionQuery.queryDelegationRewards({
      delegatorAddress: this.walletRef.getJackalAddress(),
      validatorAddress
    })
    return ret.value.rewards.reduce((acc: number, coin: ICoin) => {
      acc += Number(coin.amount)
      return acc
    }, 0)
  }
  async getTotalStaked (): Promise<number> {
    const delegations = (await this.pH.stakingQuery.queryDelegatorDelegations({
        delegatorAddr: this.walletRef.getJackalAddress()
      })).value.delegationResponses as IDelegationSummary[]
    return delegations.reduce((acc: number, del: IDelegationSummary) => {
      acc += Number(del.balance.amount)
      return acc
    }, 0)
  }
  async getStakedMap (): Promise<IDelegationSummaryMap> {
    const delegations = (await this.pH.stakingQuery.queryDelegatorDelegations({
      delegatorAddr: this.walletRef.getJackalAddress()
    })).value.delegationResponses as IDelegationSummary[]
    return delegations.reduce((acc: IDelegationSummaryMap, del: IDelegationSummary) => {
      acc[del.delegation.validatorAddress] = del
      return acc
    }, {})
  }
  async getStakedValidatorDetailsMap (): Promise<IStakingValidatorStakedMap> {
    const allVals = await this.getCompleteMergedValidatorDetailsMap()
    const staked = await this.getStakedMap()
    return await includeStaked(staked, allVals, true)
  }
  async getDelegatorValidatorDetails (validatorAddress: string): Promise<IStakingValidator> {
    const result = (await this.pH.stakingQuery.queryDelegatorValidator({
      delegatorAddr: this.walletRef.getJackalAddress(),
      validatorAddr: validatorAddress
    })).value.validator
    if (result) {
      return result as IStakingValidator
    } else {
      throw new Error('No Validator Details Found')
    }
  }
  async getAllDelegatorValidatorDetails (): Promise<IStakingValidator[]> {
    return (await this.pH.stakingQuery.queryDelegatorValidators({
      delegatorAddr: this.walletRef.getJackalAddress()
    })).value.validators as IStakingValidator[]
  }
  async getAllDelegatorValidatorDetailsMap (): Promise<IStakingValidatorMap> {
    const vals = await this.getAllDelegatorValidatorDetails()
    return vals
      .reduce((acc: IStakingValidatorMap, curr: IStakingValidator) => {
        acc[curr.operatorAddress] = curr
        return acc
      }, {})
  }
  async getValidatorDetails (validatorAddress: string): Promise<IStakingValidator> {
    const result = (await this.pH.stakingQuery.queryValidator({
      validatorAddr: validatorAddress
    })).value.validator
    if (result) {
      return result as IStakingValidator
    } else {
      throw new Error('No Validator Details Found')
    }
  }
  async getAllValidatorDetails (status: TValidatorStatus): Promise<IStakingValidator[]> {
    return (await this.pH.stakingQuery.queryValidators({
      status: statusMap[status.toUpperCase()]
    })).value.validators as IStakingValidator[]
  }
  async getAllValidatorDetailsMap (status: TValidatorStatus): Promise<IStakingValidatorMap> {
    const vals = await this.getAllValidatorDetails(status)
    return vals
      .reduce((acc, curr) => {
        acc[curr.operatorAddress] = curr
        return acc
      }, {} as IStakingValidatorMap)
  }
  async getMergedValidatorDetailsMap (status: TValidatorStatus): Promise<IStakingValidatorExtendedMap> {
    const staked = await this.getAllDelegatorValidatorDetailsMap()
    const allOfStatus = await this.getAllValidatorDetailsMap(status)
    return flagStaked(allOfStatus, staked)
  }
  async getMergedValidatorDetailsStakedMap (status: TValidatorStatus): Promise<IStakingValidatorStakedMap> {
    const staked = await this.getAllDelegatorValidatorDetailsMap()
    console.log(staked)
    const allOfStatus = await this.getAllValidatorDetailsMap(status)
    console.log(allOfStatus)
    const flagged = flagStaked(allOfStatus, staked)
    console.log(flagged)
    const stakedMap = await this.getStakedMap()
    console.log(stakedMap)
    return await includeStaked(stakedMap, flagged)
  }
  async getInactiveMergedValidatorDetailsStakedMap (): Promise<IStakingValidatorExtendedMap> {
    const staked = await this.getAllDelegatorValidatorDetailsMap()
    const allInactive = await this.getInactiveMergedValidatorDetailsMap()
    const flagged = flagStaked(allInactive, staked)
    const stakedMap = await this.getStakedMap()
    return await includeStaked(stakedMap, flagged)
  }
  async getInactiveMergedValidatorDetailsMap (): Promise<IStakingValidatorExtendedMap> {
    const staked = this.getAllDelegatorValidatorDetailsMap()
    const allUnbonding = this.getAllValidatorDetailsMap('UNBONDING')
    const allUnbonded = this.getAllValidatorDetailsMap('UNBONDED')
    const merged = { ...await allUnbonding, ...await allUnbonded }
    return flagStaked(merged, await staked)
  }
  async getCompleteMergedValidatorDetailsMap (): Promise<IStakingValidatorExtendedMap> {
    const staked = this.getAllDelegatorValidatorDetailsMap()
    const allUnbonding = this.getAllValidatorDetailsMap('UNBONDING')
    const allUnbonded = this.getAllValidatorDetailsMap('UNBONDED')
    const allActive = this.getAllValidatorDetailsMap('BONDED')
    const merged = { ...await allUnbonding, ...await allUnbonded, ...await allActive }
    return flagStaked(merged, await staked)
  }
  async claimDelegatorRewards (validatorAddresses: string[]): Promise<void> {
    const msgs = validatorAddresses.map((address: string) => {
      return this.pH.distributionTx.msgWithdrawDelegatorReward({
        delegatorAddress: this.walletRef.getJackalAddress(),
        validatorAddress: address
      })
    })
    // await this.pH.debugBroadcaster(msgs, true)
    await this.pH.debugBroadcaster(msgs, {})
  }
  rawDelegateTokens (validatorAddress: string, amount: number | string): EncodeObject {
    return this.pH.stakingTx.msgDelegate({
      delegatorAddress: this.walletRef.getJackalAddress(),
      validatorAddress,
      amount: {
        denom: 'ujkl',
        amount: amount.toString()
      }
    })
  }
  async delegateTokens (validatorAddress: string, amount: number | string): Promise<void> {
    const msg = this.rawDelegateTokens(validatorAddress, amount)
    // await this.pH.debugBroadcaster([msg], true)
    await this.pH.debugBroadcaster([msg], {})
  }
  rawUndelegateTokens (validatorAddress: string, amount: number | string): EncodeObject {
    return this.pH.stakingTx.msgUndelegate({
      delegatorAddress: this.walletRef.getJackalAddress(),
      validatorAddress,
      amount: {
        denom: 'ujkl',
        amount: amount.toString()
      }
    })
  }
  async undelegateTokens (validatorAddress: string, amount: number | string): Promise<void> {
    const msg = this.rawUndelegateTokens(validatorAddress, amount)
    // await this.pH.debugBroadcaster([msg], true)
    await this.pH.debugBroadcaster([msg], {})
  }
  rawRedelegateTokens (fromAddress: string, toAddress: string, amount: number | string): EncodeObject {
    return this.pH.stakingTx.msgBeginRedelegate({
      delegatorAddress: this.walletRef.getJackalAddress(),
      validatorSrcAddress: fromAddress,
      validatorDstAddress: toAddress,
      amount: {
        denom: 'ujkl',
        amount: amount.toString()
      }
    })
  }
  async redelegateTokens (fromAddress: string, toAddress: string, amount: number | string): Promise<void> {
    const msg = this.rawRedelegateTokens(fromAddress, toAddress, amount)
    // await this.pH.debugBroadcaster([msg], true)
    await this.pH.debugBroadcaster([msg], {})
  }
}

const statusMap: { [key: string]: string } = {
  'UNSPECIFIED': 'BOND_STATUS_UNSPECIFIED',
  'UNBONDED': 'BOND_STATUS_UNBONDED',
  'UNBONDING': 'BOND_STATUS_UNBONDING',
  'BONDED': 'BOND_STATUS_BONDED'
}

function flagStaked (base: IStakingValidatorMap, staked: IStakingValidatorMap): IStakingValidatorExtendedMap {
  const final: IStakingValidatorExtendedMap = {}
  for (let val in base) {
    if (staked[val]) {
      final[val] = { ...base[val], stakedWith: true }
    } else {
      final[val] = { ...base[val], stakedWith: false }
    }
  }
  return final
}
async function includeStaked (stakedMap: IDelegationSummaryMap, flagged: IStakingValidatorExtendedMap, ignore?: boolean): Promise<IStakingValidatorStakedMap> {
  const final: IStakingValidatorStakedMap = {}
  for (let val in flagged) {
    if (stakedMap[val]) {
      final[val] = { ...flagged[val], stakedDetails: stakedMap[val] }
    } else if (ignore) {
      // do nothing
    } else {
      final[val] = { ...flagged[val] }
    }
  }
  return final
}
