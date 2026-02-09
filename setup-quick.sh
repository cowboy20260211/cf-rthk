#!/bin/bash

# 香港电台CF版 - 自动化配置脚本 (非交互式版本)
# 用法: bash setup-quick.sh <cf_account_id> <cf_api_token> <github_token> [create_repo]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ]; then
    echo -e "${RED}错误: 缺少必要的参数${NC}"
    echo ""
    echo "用法: bash setup-quick.sh <cf_account_id> <cf_api_token> <github_token> [create_repo]"
    echo ""
    echo "参数说明:"
    echo "  cf_account_id   - Cloudflare Account ID (32位字符)"
    echo "  cf_api_token    - Cloudflare API Token"
    echo "  github_token    - GitHub Personal Access Token"
    echo "  create_repo     - 可选，设为 'yes' 则自动创建仓库"
    echo ""
    echo "示例:"
    echo "  bash setup-quick.sh abc123... xyz789... ghp_abc123... yes"
    echo ""
    exit 1
fi

CF_ACCOUNT_ID="$1"
CF_API_TOKEN="$2"
GH_TOKEN="$3"
CREATE_REPO="$4"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "========================================"
echo "香港电台CF版 - 账号配置 (非交互式)"
echo "========================================"

# 步骤 1: Git 配置
echo ""
echo "步骤 1: 配置 Git"
git config --global user.name "CF Radio"
git config --global user.email "2026012701@cowboy.cc.cd"
echo -e "${GREEN}✓ Git 配置完成${NC}"

# 步骤 2: 验证 Cloudflare
echo ""
echo "步骤 2: 验证 Cloudflare 凭据..."
CF_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $CF_API_TOKEN" \
    "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID")

if [ "$CF_RESPONSE" != "200" ]; then
    echo -e "${YELLOW}⚠ Cloudflare 凭据验证失败 (HTTP $CF_RESPONSE)${NC}"
    echo "  可能是 Account ID 或 API Token 有误"
    echo "  将继续配置，请稍后手动验证"
else
    echo -e "${GREEN}✓ Cloudflare 凭据验证成功${NC}"
fi

# 步骤 3: 验证 GitHub
echo ""
echo "步骤 3: 验证 GitHub 凭据..."
GH_USER=$(curl -s -H "Authorization: token $GH_TOKEN" \
    https://api.github.com/user | grep -o '"login": "[^"]*"' | cut -d'"' -f4)

if [ -z "$GH_USER" ]; then
    echo -e "${RED}错误: GitHub 凭据验证失败${NC}"
    exit 1
fi
echo -e "${GREEN}✓ GitHub 验证成功，用户: $GH_USER${NC}"

# 步骤 4: 创建/配置仓库
echo ""
echo "步骤 4: 配置 GitHub 仓库..."
REPO_NAME="rthk-radio-cf"

if [ "$CREATE_REPO" = "yes" ]; then
    # 检查仓库是否存在
    CHECK_REPO=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: token $GH_TOKEN" \
        "https://api.github.com/repos/$GH_USER/$REPO_NAME")

    if [ "$CHECK_REPO" = "404" ]; then
        echo "正在创建仓库..."
        curl -s -X POST \
            -H "Authorization: token $GH_TOKEN" \
            -H "Accept: application/vnd.github.v3+json" \
            https://api.github.com/user/repos \
            -d "{\"name\":\"$REPO_NAME\",\"description\":\"香港电台CF版 - 在线收听与节目点播平台\",\"private\":false}"
        echo -e "${GREEN}✓ 仓库创建成功${NC}"
    else
        echo -e "${YELLOW}⚠ 仓库已存在，使用现有仓库${NC}"
    fi
fi

# 配置远程仓库
if git remote get-url origin &> /dev/null; then
    git remote set-url origin "https://$GH_USER:$GH_TOKEN@github.com/$GH_USER/$REPO_NAME.git"
else
    git remote add origin "https://$GH_USER:$GH_TOKEN@github.com/$GH_USER/$REPO_NAME.git"
fi
echo -e "${GREEN}✓ 远程仓库配置完成${NC}"

# 步骤 5: 创建配置文件
echo ""
echo "步骤 5: 创建配置文件..."

# 创建 .env.local
cat > .env.local << EOF
# Cloudflare Configuration
CLOUDFLARE_ACCOUNT_ID=$CF_ACCOUNT_ID
CLOUDFLARE_API_TOKEN=$CF_API_TOKEN

# GitHub Configuration
GITHUB_TOKEN=$GH_TOKEN
EOF
echo -e "${GREEN}✓ .env.local 已创建${NC}"

# 更新 wrangler.toml
sed -i "s/id = \"\"/id = \"$CF_ACCOUNT_ID\"/g" wrangler.toml 2>/dev/null || \
sed -i '' "s|id = \"\"|id = \"$CF_ACCOUNT_ID\"|g" wrangler.toml
echo -e "${GREEN}✓ wrangler.toml 已更新${NC}"

# 步骤 6: 提交并推送
echo ""
echo "步骤 6: 推送代码到 GitHub..."

# 提交当前更改
if git status --porcelain | grep -q .; then
    git add -A
    git commit -m "config: 更新账号配置"
    echo -e "${GREEN}✓ 代码已提交${NC}"
else
    echo "没有需要提交的更改"
fi

# 推送
if [ "$CREATE_REPO" = "yes" ]; then
    git branch -M main
    git push -u origin main
    echo -e "${GREEN}✓ 代码已推送到 GitHub${NC}"
else
    echo -e "${YELLOW}⚠ 未创建仓库，请先创建仓库再推送${NC}"
fi

echo ""
echo "========================================"
echo "配置完成！"
echo "========================================"
echo ""
echo "后续步骤:"
echo ""
echo "1. 访问 GitHub 仓库设置添加 Secrets:"
echo "   https://github.com/$GH_USER/$REPO_NAME/settings/secrets/actions"
echo ""
echo "2. 添加以下 Secrets:"
echo "   - CLOUDFLARE_ACCOUNT_ID: $CF_ACCOUNT_ID"
echo "   - CLOUDFLARE_API_TOKEN: (你的API Token)"
echo ""
echo "3. 本地配置 Cloudflare KV:"
echo "   npx wrangler login"
echo "   npx wrangler kv:namespace create \"FAVORITES\""
echo "   npx wrangler kv:namespace create \"HISTORY\""
echo "   npx wrangler kv:namespace create \"SETTINGS\""
echo ""
echo "4. 查看详细配置文档:"
echo "   cat docs/SETUP.md"
echo ""
