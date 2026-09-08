// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract MerkleAirdrop is ERC1155, Ownable {
    uint256 public constant TOKEN_ID = 0;

    bytes32 public immutable merkleRoot;
    mapping(address => bool) public hasClaimed;

    constructor(bytes32 _merkleRoot) ERC1155("") Ownable(msg.sender) {
        merkleRoot = _merkleRoot;
    }

    function claim(bytes32[] calldata merkleProof) public {
        require(!hasClaimed[msg.sender], "Ja fez claim");

        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        require(MerkleProof.verify(merkleProof, merkleRoot, leaf), "Prova invalida");

        hasClaimed[msg.sender] = true;
        _mint(msg.sender, TOKEN_ID, 1, "");
    }

    function adminMint(address to, uint256 amount) public onlyOwner {
        _mint(to, TOKEN_ID, amount, "");
    }
}
