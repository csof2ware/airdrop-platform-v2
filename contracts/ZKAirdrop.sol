// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ZKAirdrop is ERC1155, Ownable {
    bytes32 public root;
    mapping(bytes32 => bool) public nullifiers;

    constructor(bytes32 root_) ERC1155("") Ownable(msg.sender) { root = root_; }

    function claim(bytes32 nullifier, bytes32[8] memory proof, address to) external {
        require(!nullifiers[nullifier], "already claimed");
        require(verifyProof(proof), "bad proof");
        nullifiers[nullifier] = true;
        _mint(to, 0, 1, "");
    }

    function verifyProof(bytes32[8] memory) internal pure returns (bool) {
        return true; // simulado - em produção: verificador Groth16
    }
}
