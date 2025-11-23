"""
SERP (Search Engine Results Page) 服务
用于在意图推理时搜索互联网资源，提供更准确的功能建议
"""
import os
import httpx
from typing import List, Dict, Optional
from dotenv import load_dotenv

load_dotenv()

class SerpService:
    """SERP API 服务类，用于搜索互联网资源"""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        初始化 SERP 服务
        
        Args:
            api_key: SERP API 密钥，如果为 None 则从环境变量读取
        """
        self.api_key = api_key or os.getenv("SERP_API_KEY")
        self.base_url = "https://serpapi.com/search"
        
    async def search(self, query: str, num_results: int = 5) -> List[Dict[str, str]]:
        """
        搜索相关信息
        
        Args:
            query: 搜索查询字符串
            num_results: 返回结果数量（默认 5）
            
        Returns:
            搜索结果列表，每个结果包含 title, link, snippet
        """
        if not self.api_key:
            print("⚠️ SERP_API_KEY not found, skipping web search")
            return []
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                params = {
                    "q": query,
                    "api_key": self.api_key,
                    "engine": "google",  # 使用 Google 搜索引擎
                    "num": num_results,
                    "hl": "zh-cn",  # 中文结果
                }
                
                response = await client.get(self.base_url, params=params)
                response.raise_for_status()
                data = response.json()
                
                # 解析搜索结果
                results = []
                if "organic_results" in data:
                    for item in data["organic_results"][:num_results]:
                        results.append({
                            "title": item.get("title", ""),
                            "link": item.get("link", ""),
                            "snippet": item.get("snippet", ""),
                        })
                
                print(f"🔍 Searched: '{query}' - Found {len(results)} results")
                return results
                
        except Exception as e:
            print(f"⚠️ SERP search error: {e}")
            return []
    
    async def search_related_actions(self, object_label: str, context: List[str] = None, is_product: bool = False) -> tuple[str, List[Dict[str, str]]]:
        """
        搜索与对象相关的操作和功能
        
        Args:
            object_label: 点击的对象标签（如 "Window", "Phone booth", "Dress"）
            context: 周围对象的标签列表
            is_product: 是否为商品（衣服、鞋子等）
            
        Returns:
            (格式化的搜索结果文本, 原始搜索结果列表)
        """
        # 构建搜索查询
        if is_product:
            # 对于商品，搜索购买和产品信息
            query = f"{object_label} buy purchase price"
        else:
            query = f"{object_label} 功能 操作 使用方法"
        
        if context:
            query += f" {' '.join(context[:2])}"  # 添加前两个上下文对象
        
        results = await self.search(query, num_results=5)
        
        if not results:
            return "", []
        
        # 格式化搜索结果
        formatted_results = "相关互联网资源：\n"
        for i, result in enumerate(results, 1):
            formatted_results += f"{i}. {result['title']}\n"
            formatted_results += f"   {result['snippet']}\n"
            formatted_results += f"   链接: {result['link']}\n\n"
        
        return formatted_results, results
    
    async def search_ebay(self, query: str, num_results: int = 5) -> List[Dict[str, str]]:
        """
        专门搜索 eBay 商品
        
        Args:
            query: 搜索查询
            num_results: 返回结果数量
            
        Returns:
            eBay 搜索结果列表
        """
        # 构建 eBay 搜索查询
        ebay_query = f"{query} site:ebay.com"
        return await self.search(ebay_query, num_results=num_results)

