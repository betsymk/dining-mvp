# 菜品图片目录

## 说明

在此目录下存放菜品图片文件。

## 命名规范

建议使用以下命名格式：
```
dish1.jpg
dish2.jpg
dish3.jpg
...
```

或使用菜品中文名：
```
招牌红烧肉.jpg
清蒸鲈鱼.jpg
麻婆豆腐.jpg
...
```

## 图片尺寸建议

- 宽度：800px（保持清晰度）
- 高度：自适应（保持比例）
- 格式：JPG 或 PNG
- 大小：建议小于 500KB

## 访问方式

前端访问路径：
```
/images/dish1.jpg
```

完整URL：
```
http://localhost:3000/images/dish1.jpg
```

## 当前状态

目前系统使用 placeholder 图片（https://via.placeholder.com/100）。

如需显示真实菜品图片：
1. 将图片文件放到此目录
2. 在数据库中更新 `dishes` 表的 `image_url` 字段
3. URL格式：`/images/文件名.jpg`

## 更新数据库示例

```sql
-- 更新菜品图片
UPDATE dishes
SET image_url = '/images/招牌红烧肉.jpg'
WHERE id = 1;
```

或通过管理后台编辑菜品进行修改。

## 批量上传建议

1. 准备10张菜品图片，命名为 dish1.jpg ~ dish10.jpg
2. 上传到此目录
3. 执行以下SQL更新：

```sql
UPDATE dishes SET image_url = '/images/dish1.jpg' WHERE id = 1;
UPDATE dishes SET image_url = '/images/dish2.jpg' WHERE id = 2;
UPDATE dishes SET image_url = '/images/dish3.jpg' WHERE id = 3;
UPDATE dishes SET image_url = '/images/dish4.jpg' WHERE id = 4;
UPDATE dishes SET image_url = '/images/dish5.jpg' WHERE id = 5;
UPDATE dishes SET image_url = '/images/dish6.jpg' WHERE id = 6;
UPDATE dishes SET image_url = '/images/dish7.jpg' WHERE id = 7;
UPDATE dishes SET image_url = '/images/dish8.jpg' WHERE id = 8;
UPDATE dishes SET image_url = '/images/dish9.jpg' WHERE id = 9;
UPDATE dishes SET image_url = '/images/dish10.jpg' WHERE id = 10;
```
