// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SignedAirdrop is ERC1155, EIP712, Ownable {
    bytes32 public constant CLAIM_TYPEHASH =
        keccak256("Claim(address claimant,uint256 amount,uint256 nonce)");

    address public authority;
    mapping(uint256 => bool) public used;

    constructor(address authority_)
        ERC1155("")
        EIP712("AirdropPlatform", "1")
        Ownable(msg.sender)
    {
        authority = authority_;
    }

    function claim(address claimant, uint256 amount, uint256 nonce, bytes memory sig) external {
        require(!used[nonce], "nonce used");
        bytes32 structHash = keccak256(abi.encode(CLAIM_TYPEHASH, claimant, amount, nonce));
        bytes32 digest = _hashTypedDataV4(structHash);
        require(ECDSA.recover(digest, sig) == authority, "bad signature");
        used[nonce] = true;
        _mint(claimant, 0, amount, "");
    }

    function batchClaim(
        address[] calldata claimants,
        uint256[] calldata amounts,
        uint256[] calldata nonces,
        bytes[] calldata sigs
    ) external {
        require(claimants.length == amounts.length, "length mismatch");
        require(claimants.length == nonces.length, "length mismatch");
        require(claimants.length == sigs.length, "length mismatch");

        for (uint256 i = 0; i < claimants.length; i++) {
            require(!used[nonces[i]], "nonce used");
            bytes32 structHash = keccak256(abi.encode(CLAIM_TYPEHASH, claimants[i], amounts[i], nonces[i]));
            bytes32 digest = _hashTypedDataV4(structHash);
            require(ECDSA.recover(digest, sigs[i]) == authority, "bad signature");
            used[nonces[i]] = true;
            _mint(claimants[i], 0, amounts[i], "");
        }
    }

    function setAuthority(address a) external onlyOwner {
        authority = a;
    }
}
