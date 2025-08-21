# ===== Default & Phony =====
.DEFAULT_GOAL := help
.PHONY: help uploadAssetsAndUpdateMetadata deployWithIgnition mint batchMint audit verbose

# ===== Binaries =====
HARDHAT := npx hardhat
HARDHAT_RUN := $(HARDHAT) run
TSX := npx tsx

# ===== Networks =====
NETWORKS := $(shell $(TSX) scripts/utils/getNetworks.ts)

# ===== Contracts =====
AVAILABLE_CONTRACTS := $(basename $(notdir $(shell find contracts -name "*.sol" -type f)))

# ===== Validators =====
CHECK_CONTRACT = \
	contract_file=$$(find contracts -name "$(contract).sol" -type f); \
	if [ -z "$$contract_file" ]; then \
	  echo "Error: Invalid contract. Available contracts in ./contracts/:"; \
	  if [ "$(AVAILABLE_CONTRACTS)" = "" ]; then \
	    echo "  - No contracts found in contracts/ directory"; \
	  else \
	    echo "$(AVAILABLE_CONTRACTS)" | tr ' ' '\n' | sed 's/^/  - /'; \
	  fi; \
	  exit 1; \
	fi; \

CHECK_MODULE = \
	contract_file=$$(find ignition/modules -name "$(contract).ts" -type f); \
	if [ -z "$$contract_file" ]; then \
	  echo "Error: Invalid contract module. Module should be in ./ignition/modules/"; \
	  exit 1; \
	fi; \

NETWORK_CHECK = \
	if [ -z "$(network)" ]; then echo "Error: Missing parameter 'network' (use network=<Network>)"; exit 1; fi; \
	LNET=$$(echo "$(network)" | tr '[:upper:]' '[:lower:]'); \
	ALL_NETS="$(NETWORKS)"; \
	case " $$ALL_NETS " in \
	  *" $$LNET "*) NET="$$LNET" ;; \
	  *) echo "Error: Invalid network '$$(echo $(network))'. Use one of: $(NETWORKS)"; exit 1 ;; \
	esac; \

# ===== CLI =====
help:
	@echo "Available Networks:"
	@if [ -z "$(NETWORKS)" ]; then \
		echo "  - No networks found"; \
	else \
		echo "$(NETWORKS)" | tr ' ' '\n' | sed 's/^/  - /'; \
	fi
	@echo ""
	@echo "Available Contracts:"
	@if [ "$(AVAILABLE_CONTRACTS)" = "" ]; then \
		echo "  - No contracts found in contracts/ directory"; \
	else \
		echo "$(AVAILABLE_CONTRACTS)" | tr ' ' '\n' | sed 's/^/  - /'; \
	fi
	@echo ""
	@echo "Commands:"
	@echo ""
	@echo "IPFS:"
	@echo "  make uploadAssetsAndUpdateMetadata collection=<Name> id=<number>                             => Upload NFT assets (image/video) to IPFS and update metadata"
	@echo "  make uploadAssetsAndUpdateMetadata collection=<Name> startId=<number> endId=<number>         => Upload for a range and update metadata"
	@echo ""
	@echo "Deployment:"
	@echo "  make deployWithIgnition contract=<ContractName> network=<Network>         			          => Deploy contract with Ignition"
	@echo ""
	@echo "Minting:"
	@echo "  make mint collection=<collection> id=<number> network=<Network>        		              => Mint NFT"
	@echo "  make batchMint collection=<collection> startId=<number> endId=<number> network=<Network> 	  => Batch mint NFTs"
	@echo ""
	@echo "Audit:"
	@echo "  make audit contract=<ContractName> only=<Slither|Solhint|Mythril>            			      => Run Slither/Solhint/Mythril and combine reports"
	@echo ""

# ===== Tasks =====
uploadAssetsAndUpdateMetadata:
	@if [ -z "$(collection)" ]; then \
		echo "Error: Missing parameter 'collection' (use collection=<name>)"; \
		exit 1; \
	fi
	@if [ -z "$(id)" ] && ( [ -z "$(startId)" ] || [ -z "$(endId)" ] ); then \
		echo "Error: Missing parameters. Usage:"; \
		echo "  make uploadAssetsAndUpdateMetadata collection=<name> id=<number>"; \
		echo "  make uploadAssetsAndUpdateMetadata collection=<name> startId=<number> endId=<number>"; \
		exit 1; \
	fi
	@if [ -n "$(id)" ] && ( [ -n "$(startId)" ] || [ -n "$(endId)" ] ); then \
		echo "Error: Provide either 'id' OR 'startId'+'endId', not both."; \
		exit 1; \
	fi
	@if [ -n "$(id)" ]; then \
		$(TSX) scripts/ipfs/uploadAssetsAndUpdateMetadata.ts $(collection) $(id); \
	else \
		$(TSX) scripts/ipfs/uploadAssetsAndUpdateMetadata.ts $(collection) startId=$(startId) endId=$(endId); \
	fi

deployWithIgnition:
	@if [ -z "$(contract)" ] || [ -z "$(network)" ]; then \
		echo "Error: Missing parameters. Usage: make deployWithIgnition contract=<ContractName> network=<Network>"; \
		exit 1; \
	fi
	@$(CHECK_MODULE)
	@$(NETWORK_CHECK) \
	PARAMS_FILE="$$( $(HARDHAT) --network $$NET Ignition:RouterConfigFile )"; \
	PARAMS=""; \
	if [ -n "$$PARAMS_FILE" ] && [ -f "$$PARAMS_FILE" ]; then \
		PARAMS="--parameters $$PARAMS_FILE"; \
	fi; \
	$(HARDHAT) --network $$NET ignition deploy ./ignition/modules/$(contract).ts $$PARAMS


mint:
	@if [ -z "$(collection)" ] || [ -z "$(id)" ] || [ -z "$(network)" ]; then \
		echo "Error: Missing parameters. Usage: make mint collection=<collection> id=<number> network=<Network>"; \
		exit 1; \
	fi
	@$(NETWORK_CHECK) COLLECTION=$(collection) NFT_ID=$(id) $(HARDHAT_RUN) --network $$NET scripts/mint/mintNFT.ts

batchMint:
	@if [ -z "$(collection)" ] || [ -z "$(startId)" ] || [ -z "$(endId)" ] || [ -z "$(network)" ]; then \
		echo "Error: Missing parameters. Usage: make batchMint collection=<collection> startId=<number> endId=<number> network=<Network>"; \
		exit 1; \
	fi
	@$(NETWORK_CHECK) COLLECTION=$(collection) START_ID=$(startId) END_ID=$(endId) $(HARDHAT_RUN) --network $$NET scripts/mint/batchMintNFT.ts

audit:
	@if [ -z "$(contract)" ]; then \
		echo "❌ Error: Missing parameters. Usage: make audit contract=<ContractName>"; \
		exit 1; \
	fi
	@contract_file=$$(find contracts -name "$(contract).sol" -type f); \
	if [ -z "$$contract_file" ]; then \
		echo "❌ Error: Cannot find $(contract).sol in contracts/ directory or subdirectories"; \
		exit 1; \
	fi; \
	echo "🔍 Running complete audit on $$contract_file..."; \
	mkdir -p audit-reports; \
	timestamp=$$(date +"%Y-%m-%d_%H-%M-%S"); \
	audit_file="audit-reports/AUDIT_$(contract)_$${timestamp}.txt"; \
	json_path="artifacts/$$contract_file/$(contract).json"; \
	if [ ! -f "$$json_path" ]; then \
		echo "❌ Error: Cannot find artifact at $$json_path"; \
		exit 1; \
	fi; \
	echo "=== AUDIT REPORT FOR $(contract) ===" > "$$audit_file"; \
	echo "Generated on: $$(date)" >> "$$audit_file"; \
	if [ "$(only)" = "" ] || [ "$(only)" = "Slither" ]; then \
		echo "\n=== SLITHER ANALYSIS ===" >> "$$audit_file"; \
		slither "$$contract_file" --hardhat-ignore-compile --solc-remaps "@openzeppelin=node_modules/@openzeppelin" 2>&1 | sed 's/^INFO:Detectors:/\nINFO:Detectors:/g' >> "$$audit_file" || true; \
	fi; \
	if [ "$(only)" = "" ] || [ "$(only)" = "Solhint" ]; then \
		echo "\n=== SOLHINT ANALYSIS ===" >> "$$audit_file"; \
		npx solhint "contracts/**/*.sol" "$$contract_file" >> "$$audit_file" 2>&1 || true; \
	fi; \
	if [ "$(only)" = "" ] || [ "$(only)" = "Mythril" ]; then \
		echo "\n=== MYTHRIL ANALYSIS ===" >> "$$audit_file"; \
		BYTECODE=$$(node -e 'const fs=require("fs"); const p=process.argv[1]; const j=JSON.parse(fs.readFileSync(p,"utf8")); process.stdout.write(String(j.deployedBytecode||"").replace(/^0x/,""));' "$$json_path"); \
		echo "$$BYTECODE" | myth analyze --codefile /dev/stdin >> "$$audit_file" 2>&1 || true; \
	fi; \
	echo "\n✅ Complete audit report saved to: $$audit_file"

verbose: ;
