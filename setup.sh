#!/bin/bash

# 香港电台CF版 - 自动化配置脚本
# 用法: bash setup.sh

set -e

echo "========================================"
echo "香港电台CF版 - 账号配置"
echo "========================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查命令
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}错误: $1 未安装${NC}"
        echo "请先安装: $2"
        exit 1
    fi
}

check_command "node" "Node.js"
check_command "npm" "Node.js"
check_command "git" "Git"

echo ""
echo "步骤 1: 配置 Git 用户信息"
echo "========================================"
read -p "请输入你的名字: " GIT_NAME
read -p "请输入你的邮箱: " GIT_EMAIL
git config --global user.name "$GIT_NAME"
git config --global user.email "$GIT_EMAIL"
echo -e "${GREEN}✓ Git 配置完成${NC}"

echo ""
echo "步骤 2: Cloudflare 配置"
echo "========================================"
read -p "请输入 Cloudflare Account ID (32位): " CF_ACCOUNT_ID
read -p "请输入 Cloudflare API Token: " CF_API_TOKEN

# 验证 Cloudflare Token
echo "正在验证 Cloudflare 凭据..."
CF_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $CF_API_TOKEN" \
    "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID")

if [ "$CF_RESPONSE" != "200" ]; then
    echo -e "${RED}错误: Cloudflare 凭据验证失败 (HTTP $CF_RESPONSE)${NC}"
    echo "请检查 Account ID 和 API Token 是否正确"
    exit 1
fi
echo -e "${GREEN}✓ Cloudflare 凭据验证成功${NC}"

echo ""
echo "步骤 3: GitHub 配置"
echo "========================================"
echo "请访问 https://github.com/settings/tokens 创建 Personal Access Token"
echo "需要的权限: repo, workflow"
read -p "请输入 GitHub PAT: " GH_TOKEN

# 验证 GitHub Token
echo "正在验证 GitHub 凭据..."
GH_USER=$(curl -s -H "Authorization: token $GH_TOKEN" \
    https://api.github.com/user | grep -o '"login": "[^"]*"' | cut -d'"' -f4)

if [ -z "$GH_USER" ]; then
    echo -e "${RED}错误: GitHub 凭据验证失败${NC}"
    echo "请检查 PAT 是否正确"
    exit 1
fi
echo -e "${GREEN}✓ GitHub 验证成功，用户: $GH_USER${NC}"

echo ""
echo "步骤 4: 创建 GitHub 仓库"
echo "========================================"
read -p "是否创建新的 GitHub 仓库? (y/n): " CREATE_REPO

if [ "$CREATE_REPO" = "y" ] || [ "$CREATE_REPO" = "Y" ]; then
    read -p "仓库名 (默认: rthk-radio-cf): " REPO_NAME
    REPO_NAME=${REPO_NAME:-rthk-radio-cf}

    # 检查仓库是否存在
    CHECK_REPO=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: token $GH_TOKEN" \
        "https://api.github.com/repos/$GH_USER/$REPO_NAME")

    if [ "$CHECK_REPO" = "200" ]; then
        echo -e "${YELLOW}仓库已存在，将使用现有仓库${NC}"
    else
        # 创建仓库
        echo "正在创建仓库..."
        curl -s -X POST \
            -H "Authorization: token $GH_TOKEN" \
            -H "Accept: application/vnd.github.v3+json" \
            https://api.github.com/user/repos \
            -d "{\"name\":\"$REPO_NAME\",\"description\":\"香港电台CF版 - 在线收听与节目点播平台\",\"private\":false}"
        echo -e "${GREEN}✓ 仓库创建成功${NC}"
    fi

    # 配置远程仓库
    echo "正在配置远程仓库..."
    if git remote get-url origin &> /dev/null; then
        git remote set-url origin "https://$GH_TOKEN@github.com/$GH_USER/$REPO_NAME.git"
    else
        git remote add origin "https://$GH_TOKEN@github.com/$GH_USER/$REPO_NAME.git"
    fi
    echo -e "${GREEN}✓ 远程仓库配置完成${NC}"
fi

echo ""
echo "步骤 5: 配置 Secrets"
echo "========================================"

# 创建 .env.local
cat > .env.local << EOF
# Cloudflare Configuration
CLOUDFLARE_ACCOUNT_ID=$CF_ACCOUNT_ID
CLOUDFLARE_API_TOKEN=$CF_API_TOKEN

# GitHub Configuration
GITHUB_TOKEN=$GH_TOKEN
EOF
echo -e "${GREEN}✓ .env.local 已创建${NC}"

# 创建 .npmrc
cat > .npmrc << EOF
//registry.npmjs.org/:_authToken=${NPM_TOKEN:-}
EOF
echo -e "${GREEN}✓ .npmrc 已创建${NC}"

echo ""
echo "========================================"
echo "配置完成！"
echo "========================================"
echo ""
echo "下一步操作:"
echo "1. 访问 https://github.com/<你的用户名>/rthk-radio-cf/settings/secrets/actions"
echo "2. 添加以下 Secrets:"
echo "   - CLOUDFLARE_ACCOUNT_ID: $CF_ACCOUNT_ID"
echo "   - CLOUDFLARE_API_TOKEN: (你的API Token)"
echo ""
echo "3. 推送代码到 GitHub:"
echo "   git add . && git commit -m \"feat: 初始提交\" && git push"
echo ""
echo "4. 配置 Cloudflare KV 命名空间:"
echo "   npx wrangler login"
echo "   npx wrangler kv:namespace create \"FAVORITES\""
echo "   npx wrangler kv:namespace create \"HISTORY\""
echo "   npx wrangler kv:namespace create \"SETTINGS\""
echo ""
