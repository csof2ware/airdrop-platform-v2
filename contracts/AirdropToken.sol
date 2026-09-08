// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AirdropToken is ERC1155, Ownable {
    // IDs dos tokens: ERC-1155 usa UM contrato para VÁRIOS tokens
    uint256 public constant EARLY_ADOPTER = 0;
    uint256 public constant VIP = 1;

    constructor() ERC1155("") Ownable(msg.sender) {}

    function setURI(string memory newuri) public onlyOwner {
        _setURI(newuri); // metadata (IPFS entrará na Semana 2)
    }

    // Mint de 1 tipo de token
    function mint(address account, uint256 id, uint256 amount) public onlyOwner {
        _mint(account, id, amount, "");
    }

    // BATCH: vários tipos de token, 1 carteira, 1 transação
    function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts)
        public onlyOwner
    {
        _mintBatch(to, ids, amounts, "");
    }

    // AIRDROP: mesmo token, MUITAS carteiras, 1 transação
    function airdrop(address[] calldata recipients, uint256 id, uint256 amount)
        public onlyOwner
    {
        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], id, amount, "");
        }
    }
}
