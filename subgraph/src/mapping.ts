import { TransferSingle as TransferEvent } from "../generated/AirdropToken/AirdropToken";
import { Holder, TransferSingle } from "../generated/schema";
import { BigInt } from "@graphprotocol/graph-ts";

export function handleTransferSingle(event: TransferEvent): void {
  let toId = event.params.to.toHexString();

  let holder = Holder.load(toId);
  if (holder == null) {
    holder = new Holder(toId);
    holder.address = event.params.to;
    holder.balance = BigInt.zero();
    holder.transferCount = 0;
  }
  holder.balance = holder.balance.plus(event.params.value);
  holder.transferCount = holder.transferCount + 1;
  holder.save();

  let id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let t = new TransferSingle(id);
  t.operator = event.params.operator;
  t.from = event.params.from;
  t.to = toId;
  t.tokenId = event.params.id;
  t.value = event.params.value;
  t.blockNumber = event.block.number;
  t.txHash = event.transaction.hash;
  t.save();
}
