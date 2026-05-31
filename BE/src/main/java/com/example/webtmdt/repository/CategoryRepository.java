package com.example.webtmdt.repository;

import com.example.webtmdt.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {

    List<Category> findByParentIsNullAndActiveTrueOrderByIdAsc();

    List<Category> findByParentIdAndActiveTrue(Long parentId);

    boolean existsByName(String name);
}
