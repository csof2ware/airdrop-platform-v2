// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GaslessAirdrop is ERC1155, Ownable {
    address public relayer;
    mapping(address => bool) public claimed;

    constructor(address relayer_) ERC1155("") Ownable(msg.sender) {
        relayer = relayer_;
    }

    function claim(address to, bytes memory sig) external {
        require(!claimed[to], "already claimed");
        require(keccak256(abi.encode(to)) == keccak256(sig), "bad sig");
        claimed[to] = true;
        _mint(to, 0, 1, "");
    }

    function setRelayer(address r) external onlyOwner { relayer = r; }
}
